import type { SystemHealthInsight, VpsSystemInfo, VpsLogEntry, AdaptiveConfig, DecisionContext, IDTAction, AdaptivePolicy } from '../types';
import { getFeedbackSummary } from './adaptiveFeedbackService';
import { evaluateDecisionTree } from '../modules/intelligentDecisionTree';
import { defaultPolicy } from '../policies/defaultPolicy';
import { postDecisionLog } from './decisionService';

/**
 * Translates the output of the IDT (an array of actions) into a single AdaptiveConfig object
 * that the UI can understand and display.
 * @param actions - The array of IDTAction objects from the decision evaluation.
 * @returns An AdaptiveConfig object.
 */
function translateIDTToActionableConfig(actions: IDTAction[]): AdaptiveConfig {
    const fallbackConfig: AdaptiveConfig = {
        policy: "IMMEDIATE",
        deployDelayInSeconds: 0,
        reason: "System nominal. Auto-deployments will proceed immediately.",
        confidence: 1.0, // Confidence is 1.0 as it's a deterministic rule
        suggestedActions: ["Monitor deployment"],
        cooldownSeconds: 60,
        maxConcurrentDeploys: 1,
        generatedAt: new Date().toISOString()
    };

    if (!actions || actions.length === 0) {
        return fallbackConfig;
    }

    // Prioritize the most severe action
    const priorityAction = actions.sort((a, b) => {
        const levels = { 'CRITICAL': 3, 'WARN': 2, 'INFO': 1 };
        return (levels[b.level || 'INFO'] || 0) - (levels[a.level || 'INFO'] || 0);
    })[0];

    let policy: AdaptivePolicy = 'IMMEDIATE';
    if (priorityAction.level === 'CRITICAL' || priorityAction.recommendManual) {
        policy = 'MANUAL_APPROVAL';
    } else if (priorityAction.level === 'WARN') {
        policy = 'DELAYED';
    }
    
    const reason = actions.map(a => a.label).join(' | ');
    const suggestedActions = actions.filter(a => a.recommendManual).map(a => a.label);

    return {
        policy,
        reason,
        // Use delay from payload if available, otherwise default for DELAYED policy
        deployDelayInSeconds: policy === 'DELAYED' ? (priorityAction.payload?.delaySeconds ?? 300) : 0,
        confidence: 1.0,
        suggestedActions: suggestedActions.length > 0 ? suggestedActions : [reason],
        cooldownSeconds: 300,
        maxConcurrentDeploys: 1,
        generatedAt: new Date().toISOString()
    };
}


export async function getAdaptiveConfig(
    healthInsight: SystemHealthInsight,
    vpsInfo: VpsSystemInfo,
    logs: VpsLogEntry[],
    project: string
): Promise<AdaptiveConfig> {
    // 1. Fetch historical performance summary
    const summary = await getFeedbackSummary(project);

    // 2. Construct the Decision Context for the IDT
    const context: DecisionContext = {
        project,
        outcome: healthInsight.metrics.successRate < 100 ? 'FAIL' : 'SUCCESS',
        metrics: {
            successRate: healthInsight.metrics.successRate,
            avgDeployTime: healthInsight.metrics.avgDeployTime,
            cpu: vpsInfo.loadAvg ? Math.min(parseFloat(vpsInfo.loadAvg[0].toFixed(2)) * 10, 100) : 0,
            memory: parseFloat(vpsInfo.memory) || 0,
            healthChecksFailed: logs.filter(l => l.text.toLowerCase().includes('health check failed')).length
        },
        recentTrend: {
            accuracy7d: summary ? (summary.accuracyRate / 100.0) : 1.0
        }
    };

    // 3. Evaluate the decision using the IDT
    const decision = evaluateDecisionTree(defaultPolicy, context);
    
    // 4. Log the entire decision trace to the backend for auditing
    await postDecisionLog(decision);
    
    // 5. Translate the IDT's recommended actions into an AdaptiveConfig for the UI
    const config = translateIDTToActionableConfig(decision.actions);

    // Placeholder for future implementation where auto-actions are executed.
    // For now, all actions are surfaced as recommendations in the UI via AdaptiveConfig.
    // for (const action of decision.actions) {
    //     if (action.auto) {
    //         await executeAction(action);
    //     }
    // }
    
    return config;
}
