import React from 'react';
import { useSystemMonitor } from '../hooks/useSystemMonitor';
import type { AppState } from '../types';

const StatusPill: React.FC<{ color: 'yellow' | 'green' | 'red' | 'cyan', text: string, pulse?: boolean }> = ({ color, text, pulse }) => {
    const colorClasses = {
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
        red: 'bg-red-500',
        cyan: 'bg-cyan-500',
    };

    return (
        <div className="flex items-center space-x-2">
            <div className={`h-2.5 w-2.5 rounded-full ${colorClasses[color]} ${pulse ? 'animate-pulse' : ''}`}></div>
            <span className={`text-sm font-bold text-gray-300`}>{text}</span>
        </div>
    );
};

const getEngineStatus = (appState: AppState): { text: string; color: 'green' | 'cyan' | 'red' | 'yellow' } => {
    switch (appState) {
        case 'idle': return { text: 'Idle', color: 'green' };
        case 'analyzing': return { text: 'Analyzing...', color: 'cyan' };
        case 'analyzed': return { text: 'Analysis Done', color: 'green' };
        case 'building':
        case 'simulating':
            return { text: 'Processing...', color: 'cyan' };
        case 'built': return { text: 'Build Ready', color: 'green' };
        case 'deploying': return { text: 'Deploying...', color: 'cyan' };
        case 'rollingBack': return { text: 'Rolling Back...', color: 'yellow' };
        case 'success': return { text: 'Success', color: 'green' };
        case 'error': return { text: 'Error', color: 'red' };
        default: return { text: 'Standby', color: 'yellow' };
    }
};


export const SystemDashboard: React.FC<{ appState: AppState; }> = ({ appState }) => {
  const { vpsInfo, vpsStatus } = useSystemMonitor();
  const engineStatus = getEngineStatus(appState);

  return (
    <div className="flex flex-col space-y-4 text-xs text-gray-400 font-mono h-full justify-end">
        {/* Engine Status */}
         <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
             <div className="flex justify-between items-center mb-3">
                 <p className="font-bold text-sm text-gray-300">🚀 Engine Status</p>
                 <StatusPill 
                    color={engineStatus.color} 
                    text={engineStatus.text} 
                    pulse={['analyzing', 'building', 'simulating', 'deploying', 'rollingBack'].includes(appState)} 
                 />
             </div>
        </div>

        {/* VPS Monitor */}
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-3">
                 <p className="font-bold text-sm text-gray-300">⚙️ VPS Monitor</p>
                 <StatusPill 
                    text={vpsStatus.charAt(0).toUpperCase() + vpsStatus.slice(1)} 
                    color={vpsStatus === 'online' ? 'green' : vpsStatus === 'checking' ? 'yellow' : 'red'}
                    pulse={vpsStatus === 'checking'}
                 />
            </div>
             {vpsStatus === 'online' && vpsInfo ? (
                    <>
                        <p><span className="text-gray-500 w-20 inline-block">Platform:</span> {vpsInfo.platform}</p>
                        <p><span className="text-gray-500 w-20 inline-block">Memory:</span> {vpsInfo.memory}</p>
                        <p><span className="text-gray-500 w-20 inline-block">Load Avg:</span> {vpsInfo.loadAvg[0].toFixed(2)}</p>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-600 pt-2">
                        <p>{vpsStatus === 'checking' ? 'Awaiting server response...' : 'Server is unreachable.'}</p>
                    </div>
                )}
        </div>
    </div>
  );
};
