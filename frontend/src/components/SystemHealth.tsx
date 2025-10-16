import React from 'react';
import type { SystemHealthInsight, SystemHealthLevel, FeedbackSummary } from '../types';

const HealthStatusPill: React.FC<{ level: SystemHealthLevel }> = ({ level }) => {
    const styles: { [key in SystemHealthLevel]: { text: string; bg: string; dot: string } } = {
        Nominal: { text: 'text-green-300', bg: 'bg-green-900/40', dot: 'bg-green-400' },
        Warning: { text: 'text-yellow-300', bg: 'bg-yellow-900/40', dot: 'bg-yellow-400' },
        Critical: { text: 'text-red-300', bg: 'bg-red-900/40', dot: 'bg-red-400' },
        Unknown: { text: 'text-gray-400', bg: 'bg-gray-800/40', dot: 'bg-gray-500' },
    };
    const currentStyle = styles[level];

    return (
        <div className={`flex items-center space-x-2 px-2 py-1 rounded-full ${currentStyle.bg}`}>
            <div className={`h-2 w-2 rounded-full ${currentStyle.dot} ${level === 'Warning' ? 'animate-pulse' : ''}`}></div>
            <span className={`text-xs font-bold ${currentStyle.text}`}>{level}</span>
        </div>
    );
};

const AIAccuracy: React.FC<{ summary: FeedbackSummary | null }> = ({ summary }) => {
    const accuracy = summary?.accuracyRate ?? 0;
    const avgConfidence = summary?.averageConfidence ?? 0;
    const color = accuracy > 80 ? 'bg-green-500' : accuracy > 60 ? 'bg-yellow-500' : 'bg-red-500';
    
    if(!summary || summary.total === 0) {
        return (
            <div className="border-t border-gray-800 mt-3 pt-3">
                 <p className="font-semibold text-sm text-gray-500 mb-1">🎯 AI Accuracy</p>
                 <p className="text-xs text-gray-600 italic">No deployment data recorded yet.</p>
            </div>
        )
    }

    return (
        <div className="border-t border-gray-800 mt-3 pt-3">
            <div className="flex justify-between items-center mb-1">
                 <p className="font-semibold text-sm text-gray-300">🎯 AI Accuracy</p>
                 <div className="text-right">
                    <p className="text-sm font-bold text-white">{accuracy}%</p>
                    <p className="text-[10px] text-gray-400">Avg. Confidence: {(avgConfidence * 100).toFixed(0)}%</p>
                 </div>
            </div>
            <div title={`Based on ${summary.total} decisions`} className="w-full bg-gray-700/50 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${accuracy}%` }}></div>
            </div>
             <div className="mt-2 text-center text-gray-500 text-[10px] grid grid-cols-7 gap-1">
                 {summary.trend.map((day, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <span>{day.label.slice(0, 1)}</span>
                         <div className={`w-1.5 h-1.5 rounded-full mt-1 ${day.accuracy === null ? 'bg-gray-700' : day.accuracy > 80 ? 'bg-green-500' : 'bg-red-500'}`} title={`${day.label}: ${day.accuracy ?? 'N/A'}%`}></div>
                    </div>
                 ))}
             </div>
        </div>
    )
}

export const SystemHealth: React.FC<{ health: SystemHealthInsight | null; feedbackSummary: FeedbackSummary | null; }> = ({ health, feedbackSummary }) => {

    const healthLevel = health?.level || "Unknown";
    const healthMessage = health?.message || "Awaiting post-deployment analysis...";

    return (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg animate-fade-in">
             <div className="flex justify-between items-center mb-3">
                 <p className="font-bold text-sm text-gray-300">🔬 System Health</p>
                 <HealthStatusPill level={healthLevel} />
             </div>

            <div className="bg-black/30 p-3 rounded-md border border-gray-800 mb-3">
                <p className="text-xs text-gray-400 italic">&ldquo;{healthMessage}&rdquo;</p>
                <p className="text-right text-cyan-400 text-xs mt-1">- AI Insight</p>
            </div>
             
             <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-800/50 p-2 rounded">
                    <p className="text-sm font-semibold text-white">{(health?.metrics.successRate ?? 0).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Success Rate</p>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                    <p className="text-sm font-semibold text-white">{(health?.metrics.avgDeployTime ?? 0).toFixed(1)}s</p>
                    <p className="text-xs text-gray-500">Avg. Deploy</p>
                </div>
             </div>
             <AIAccuracy summary={feedbackSummary} />
        </div>
    );
};