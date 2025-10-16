import React from 'react';
import type { AdaptiveConfig, AdaptivePolicy } from '../types';

const PolicyPill: React.FC<{ policy: AdaptivePolicy }> = ({ policy }) => {
    const styles: { [key in AdaptivePolicy]: { text: string; bg: string; icon: string } } = {
        IMMEDIATE: { text: 'text-green-300', bg: 'bg-green-900/40', icon: '⚡' },
        DELAYED: { text: 'text-yellow-300', bg: 'bg-yellow-900/40', icon: '⏳' },
        MANUAL_APPROVAL: { text: 'text-cyan-300', bg: 'bg-cyan-900/40', icon: '✋' },
    };
    const currentStyle = styles[policy];

    return (
        <div className={`flex items-center space-x-2 px-2 py-1 rounded-full ${currentStyle.bg}`}>
            <span className="text-xs">{currentStyle.icon}</span>
            <span className={`text-xs font-bold ${currentStyle.text}`}>{policy.replace('_', ' ')}</span>
        </div>
    );
};

const ConfidenceIndicator: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.round(score * 100);
    let color = 'bg-green-500';
    if (percentage < 80) color = 'bg-yellow-500';
    if (percentage < 60) color = 'bg-red-500';

    return (
        <div className="bg-gray-800/50 p-2 rounded text-center">
            <p className="text-sm font-semibold text-white">{percentage}%</p>
            <p className="text-xs text-gray-500 mb-1">AI Confidence</p>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className={`${color} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const AdaptiveTuner: React.FC<{ config: AdaptiveConfig | null }> = ({ config }) => {

    const safeConfig: AdaptiveConfig = config || {
        policy: "IMMEDIATE",
        reason: "System nominal. Auto-deployments will proceed immediately.",
        deployDelayInSeconds: 0,
        confidence: 1.0,
        suggestedActions: [],
        cooldownSeconds: 0,
        maxConcurrentDeploys: 1,
        generatedAt: new Date().toISOString()
    };
    
    const { policy, reason, deployDelayInSeconds, confidence, suggestedActions } = safeConfig;

    return (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg animate-fade-in">
             <div className="flex justify-between items-center mb-3">
                 <p className="font-bold text-sm text-gray-300">🧠 Adaptive Tuner</p>
                 <PolicyPill policy={policy} />
             </div>

            <div className="bg-black/30 p-3 rounded-md border border-gray-800 mb-3">
                <p className="text-xs text-gray-400 italic">&ldquo;{reason}&rdquo;</p>
                 {policy === 'DELAYED' && (
                    <p className="text-right text-yellow-400 text-xs mt-1">- Delaying next auto-deploy by {deployDelayInSeconds}s</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <ConfidenceIndicator score={confidence} />
                <div className="bg-gray-800/50 p-2 rounded">
                    <p className="text-xs text-gray-500 mb-1 text-center">Suggested Actions</p>
                    {suggestedActions && suggestedActions.length > 0 ? (
                        <ul className="text-xs text-gray-300 list-disc list-inside space-y-1 overflow-hidden">
                           {suggestedActions.slice(0, 2).map((action, i) => 
                                <li key={i} className="truncate" title={action}>{action}</li>
                            )}
                        </ul>
                    ) : (
                         <p className="text-xs text-gray-600 text-center italic">None</p>
                    )}
                </div>
            </div>
        </div>
    );
};