// src/services/decisionService.ts
import { authHandler } from "../modules/authHandler";
import { Logger } from "../modules/logger";
import { DEPLOYMENT_CONFIG } from "../config";

/**
 * Sends the full IDT decision object to the backend for auditing and storage.
 * @param payload - The full evaluation result from the IDT.
 */
export async function postDecisionLog(payload: any): Promise<void> {
  const session = authHandler.getActiveSession();
  if (!session) {
    Logger.log('warning', "Cannot post decision log: No active secure session.");
    return;
  }

  try {
    const endpoint = DEPLOYMENT_CONFIG.API_ENDPOINT.replace('/upload', '/api/feedback/decision');
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    Logger.log('info', `Successfully logged IDT decision for project: ${payload.contextSnapshot.project}`);
  } catch (error) {
      Logger.log('error', `Failed to post IDT decision log: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Placeholder for executing an action recommended by the IDT.
 * In a real-world scenario, this would trigger API calls to infrastructure tools.
 * @param action - The IDTAction to execute.
 */
export async function executeAction(action: any): Promise<void> {
    Logger.log('info', `[IDT Action] Executing action: ${action.id}`);
    // This is a stub. A real implementation would have a switch statement
    // or a mapping to different functions based on action.id.
    // e.g., if (action.id === 'rollback') { await triggerRollback(action.payload); }
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async work
    Logger.log('success', `[IDT Action] Finished executing: ${action.id}`);
}
