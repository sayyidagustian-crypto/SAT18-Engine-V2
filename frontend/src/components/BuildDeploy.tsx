import React, { useMemo, useState } from 'react';
import type { AppState, BuildTarget, BuildResult, BuildOptions, VpsLogEntry } from '../types';
import { useSystemMonitor } from '../hooks/useSystemMonitor';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { useLogger } from '../hooks/useLogger';
import type { LogEntry } from '../modules/logger';
import { LogViewer } from './LogViewer';

interface BuildDeployProps {
    appState: AppState;
    appName: string;
    onAppNameChange: (name: string) => void;
    onBuild: (options: BuildOptions) => void;
    onSimulateBuild: (options: BuildOptions) => void;
    onDeploy: () => void;
    buildResult: BuildResult | null;
    onBack: () => void;
    vpsLogs: VpsLogEntry[];
    isAutoDeployEnabled: boolean; // Kept for prop consistency, but logic is removed
    onAutoDeployChange: (enabled: boolean) => void; // Kept for prop consistency
    adaptiveConfig: null; // Explicitly null
}

const LogLine = React.memo(({ log }: { log: LogEntry }) => (
    <div className="flex items-start">
        <span className="w-20 inline-block opacity-60 flex-shrink-0">[{log.time}]</span>
        <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
    </div>
));

export const BuildDeploy: React.FC<BuildDeployProps> = ({ 
    appState, appName, onAppNameChange, onBuild, onSimulateBuild, onDeploy, buildResult, 
    onBack, vpsLogs
}) => {
    const [target, setTarget] = useState<BuildTarget>('web');
    const { vpsStatus } = useSystemMonitor();
    const { logs } = useLogger();
    
    const isProcessing = ['building', 'simulating', 'deploying', 'rollingBack'].includes(appState);
    const isBuilt = appState === 'built' || appState === 'success' || (appState === 'error' && buildResult !== null);
    const hasDeployed = ['deploying', 'success', 'error', 'rollingBack'].includes(appState) && buildResult !== null;
    
    const buildLogs = useMemo(() => {
        if (appState === 'idle' || appState === 'analyzed') return [];
        return logs.filter(log => ['building', 'simulating', 'deploying', 'rollingBack', 'built', 'success', 'error'].includes(appState));
    }, [logs, appState]);

    const handleDownload = () => {
        if (!buildResult) return;
        const url = URL.createObjectURL(buildResult.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildResult.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const StatusAndLogs = () => {
        let message = '';
        let color = 'text-gray-400';

        if (appState === 'idle' || appState === 'analyzed') {
            return (
                 <div className="mt-6 text-center text-gray-500 font-mono text-sm">
                    <p>Configure build options and prepare your package.</p>
                 </div>
            );
        }

        switch (appState) {
            case 'simulating':
                message = 'Simulating build process...';
                color = 'text-cyan-400';
                break;
            case 'building':
                message = 'Preparing build package...';
                color = 'text-cyan-400';
                break;
            case 'built':
                message = `Build complete: ${buildResult?.filename}`;
                color = 'text-green-400';
                break;
            case 'deploying':
                message = 'Deploying to SAT18 VPS...';
                color = 'text-cyan-400';
                break;
            case 'rollingBack':
                message = 'Deployment failed. Rolling back...';
                color = 'text-yellow-400';
                break;
            case 'success':
                message = 'Deployment successful!';
                color = 'text-green-400';
                break;
            case 'error':
                message = 'An error occurred. Check logs for details.';
                color = 'text-red-400';
                break;
        }

        return (
             <div className="mt-6 flex flex-col space-y-3 animate-fade-in">
                <div className="flex items-center justify-center p-3 bg-gray-900 rounded-lg border border-gray-800 h-12">
                    {isProcessing && <SpinnerIcon className="h-4 w-4 mr-2" />}
                    <p className={`text-sm font-medium ${color}`}>{message}</p>
                </div>

                 {(appState === 'deploying' || appState === 'rollingBack') && (
                    <div className="flex items-center justify-center text-xs font-mono text-green-400 p-2 bg-green-900/30 rounded-md border border-green-700/50">
                        <span className="mr-2">🔐</span>
                        Secure Bridge Active
                    </div>
                 )}

                {isProcessing && appState !== 'deploying' && appState !== 'rollingBack' &&(
                    <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-cyan-400 h-2.5 rounded-full w-full animate-pulse"></div>
                    </div>
                )}
                
                <pre className="bg-black/50 p-3 rounded-lg text-xs h-32 overflow-y-auto font-mono border border-gray-800 text-gray-300">
                    {buildLogs.length > 0 ? buildLogs.map((log, i) => (
                        <LogLine key={i} log={log} />
                    )) : <span className="text-gray-600">Awaiting system activity...</span>}
                </pre>
            </div>
        );
    };
    
    const getDeployButton = () => {
        const isDeploying = appState === 'deploying';
        const isVpsOffline = vpsStatus !== 'online';
        
        const text = 'Deploy to SAT18 VPS';
        const className = 'bg-green-600 hover:bg-green-700';
        const disabled = isDeploying || isVpsOffline;
        let title = '';

        if (isVpsOffline) title = 'VPS is offline';
        
        return (
             <button
                onClick={onDeploy}
                disabled={disabled}
                title={title}
                className={`w-full ${className} disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center`}
            >
                {isDeploying && <SpinnerIcon className="h-5 w-5 mr-2" />}
                {text}
            </button>
        )
    }

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 h-full flex flex-col animate-fade-in">
            <div className="flex items-center mb-4">
                 <button onClick={onBack} className="mr-4 text-gray-400 hover:text-white">&larr; Back</button>
                 <h2 className="text-xl font-semibold text-white">3. Build & Deploy Center</h2>
            </div>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="appName" className="block text-sm font-medium text-gray-300 mb-1">
                            App Name
                        </label>
                        <input
                            type="text"
                            id="appName"
                            value={appName}
                            onChange={(e) => onAppNameChange(e.target.value)}
                            disabled={isProcessing || isBuilt}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Build Target
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['web', 'android', 'ios'] as BuildTarget[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTarget(t)}
                                    disabled={isProcessing || isBuilt}
                                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${target === t ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                        <button
                            onClick={() => onSimulateBuild({ appName, target })}
                            disabled={isProcessing || isBuilt || !appName.trim()}
                            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                        {appState === 'simulating' && <SpinnerIcon className="h-5 w-5 mr-2" />}
                        Simulate Build
                        </button>
                        <button
                            onClick={() => onBuild({ appName, target })}
                            disabled={isProcessing || isBuilt || !appName.trim()}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                        {appState === 'building' && <SpinnerIcon className="h-5 w-5 mr-2" />}
                        🧱 Prepare Build Package
                        </button>
                    </div>

                    {isBuilt && (
                        <div className="border-t border-gray-700 pt-4 animate-fade-in">
                            <h3 className="text-lg font-medium text-white mb-3">Deployment Pipeline</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={handleDownload}
                                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Download .zip
                                </button>
                                {getDeployButton()}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-col">
                   <StatusAndLogs />
                </div>
            </div>

            {hasDeployed && (
                <div className="mt-4 border-t border-gray-800 pt-4 animate-fade-in">
                    <LogViewer logs={vpsLogs} />
                </div>
            )}
        </div>
    );
};
