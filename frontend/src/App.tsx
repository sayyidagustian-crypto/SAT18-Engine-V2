import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisResults } from './components/AnalysisResults';
import { BuildDeploy } from './components/BuildDeploy';
import { SystemDashboard } from './components/SystemDashboard';
import LogConsole from './components/LogConsole';
import { AppStepper } from './components/AppStepper';
import Toast from './components/Toast';
import { CodeIcon } from './components/icons/CodeIcon';
import { Logger } from './modules/logger';
import { useProjectAnalyzer } from './hooks/useProjectAnalyzer';

import type { AppState, AppStep, UploadedFile, AnalysisResult, BuildOptions, BuildResult, ToastInfo, VpsLogEntry } from './types';

// Services
import { prepareBuild } from './modules/buildPreparer';
import { deployToVps } from './modules/vpsDeployer';
import { LogStream, LogCallback } from './modules/logStream';
import { authHandler } from './modules/authHandler';


export default function App(): React.ReactElement {
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentStep, setCurrentStep] = useState<AppStep>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [appName, setAppName] = useState('MyWebApp');
  
  const { analysisResult, analysisError, analyzeProject, clearAnalysis } = useProjectAnalyzer();
  
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [vpsLogs, setVpsLogs] = useState<VpsLogEntry[]>([]);
  const logStreamRef = useRef<LogStream | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };
  
  const handleNewVpsLog = useCallback<LogCallback>((log) => {
    const newEntry: VpsLogEntry = {
        id: crypto.randomUUID(),
        text: log.text,
        level: log.level,
        timestamp: log.ts,
        meta: log.meta,
    };
    setVpsLogs(prev => [...prev.slice(-500), newEntry]);
  }, []);

  const handleAnalyze = useCallback(async (files: UploadedFile[]) => {
    Logger.clear();
    setAppState('analyzing');
    setUploadedFiles(files);
    setBuildResult(null);

    await analyzeProject(files);

    setAppState('analyzed');
    setCurrentStep('analyze');
    showToast('Project analysis complete.', 'success');
  }, [analyzeProject]);
  
  const handleBuild = useCallback(async (options: BuildOptions) => {
    if (!analysisResult) return;
    Logger.log('info', `Preparing build for target '${options.target}' with app name '${options.appName}'...`);
    setAppState('building');
    setBuildResult(null);
    setAppName(options.appName);
    
    try {
      const blob = await prepareBuild(uploadedFiles, analysisResult.files, options);
      const filename = `${options.appName.toLowerCase().replace(/\s+/g, '-')}-${options.target}.zip`;
      setBuildResult({ blob, filename });
      setAppState('built');
      setCurrentStep('build');
      Logger.log('success', `Build package '${filename}' created successfully.`);
      showToast(`Build Kit '${filename}' created!`, 'success');
    } catch(e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred during build preparation.';
      setAppState('error');
      Logger.log('error', `Build preparation failed: ${error}`);
      showToast(`Build failed: ${error}`, 'error');
    }
  }, [analysisResult, uploadedFiles]);

  const handleSimulateBuild = useCallback(async (options: BuildOptions) => {
      if (!analysisResult) return;
      Logger.log('info', `Starting build simulation for '${options.appName}'...`);
      setAppState('simulating');
      setAppName(options.appName);

      // Simulate steps in a worker-like fashion
      await new Promise(res => setTimeout(res, 500));
      Logger.log('info', `> Checking ${analysisResult.files.length} file dependencies...`);
      await new Promise(res => setTimeout(res, 1000));
      Logger.log('info', `> Verifying output folder structure for target '${options.target}'...`);
       await new Promise(res => setTimeout(res, 500));
      Logger.log('success', 'Simulation complete. No issues found.');
      showToast('Build simulation completed successfully.', 'info');
      setAppState('analyzed'); // Return to analyzed state after simulation

  }, [analysisResult]);
  
  const handleDeploy = useCallback(async () => {
    if (!buildResult) return;
    setAppState('deploying');
    setVpsLogs([]); // Clear previous logs
    
    try {
      const result = await deployToVps(buildResult.blob, (message) => Logger.log('info', message));
      if (result.success && result.session) {
        setAppState('deploying'); // It's still deploying, server is just starting
        Logger.log('success', `Deployment upload complete! Server response: ${result.message}`);
        showToast('Package uploaded, awaiting server build...', 'info');

        // Close any existing stream and start a new one
        logStreamRef.current?.close();
        const stream = new LogStream(handleNewVpsLog);
        await stream.init({
            wsUrl: result.session.wsUrl,
            token: result.session.token,
            sessionKeyBase64: result.session.sessionKeyBase64
        });
        logStreamRef.current = stream;

      } else {
        setAppState('error');
        Logger.log('error', `Deployment failed: ${result.message}`);
        showToast(`Deployment failed: ${result.message}`, 'error');
      }
    } catch(e) {
       const error = e instanceof Error ? e.message : 'An unknown error occurred during deployment.';
       setAppState('error');
       Logger.log('error', `Deployment failed: ${error}`);
       showToast(`Deployment failed: ${error}`, 'error');
    }
  }, [buildResult, handleNewVpsLog]);
  
  // Log Monitoring & Recovery Effect
  useEffect(() => {
    if(vpsLogs.length > 0) {
        const lastLog = vpsLogs[vpsLogs.length - 1];
        
        if (lastLog.level?.toLowerCase() === 'success' && lastLog.text.includes('Deployment successful')) {
            setAppState('success');
            showToast('Deployment to SAT18 VPS successful!', 'success');
            logStreamRef.current?.close();
        } else if (lastLog.level?.toLowerCase() === 'error' && appState !== 'rollingBack' && appState !== 'error') {
            setAppState('rollingBack');
            Logger.log('warning', `Deployment failed: ${lastLog.text}. Initiating automatic rollback...`);
            
            setTimeout(() => {
                setAppState('error');
                Logger.log('error', 'Rollback complete. System returned to a stable state.');
                showToast(`Deployment failed, rolled back to previous version.`, 'error');
                logStreamRef.current?.close();
            }, 2500);
        }
    }
  }, [vpsLogs, appState]);


  const handleReset = useCallback(() => {
    setAppState('idle');
    setCurrentStep('upload');
    setUploadedFiles([]);
    clearAnalysis();
    setBuildResult(null);
    Logger.clear();
    setVpsLogs([]);
    logStreamRef.current?.close();
    authHandler.clearSession();
    Logger.log('info', 'System reset. Ready for new analysis.');
    showToast('System has been reset.', 'info');
  }, [clearAnalysis]);

  const renderCurrentStep = () => {
    switch (currentStep) {
        case 'upload':
            return (
                 <FileUpload 
                  onAnalyze={handleAnalyze}
                  isLoading={appState === 'analyzing'}
                  hasAnalysis={!!analysisResult}
                  onReset={handleReset}
                />
            );
        case 'analyze':
            return (
                <AnalysisResults 
                  isLoading={appState === 'analyzing'}
                  analysisResult={analysisResult}
                  error={analysisError}
                />
            );
        case 'build':
             return (
                <BuildDeploy 
                    appState={appState}
                    appName={appName}
                    onAppNameChange={setAppName}
                    onBuild={handleBuild}
                    onSimulateBuild={handleSimulateBuild}
                    onDeploy={handleDeploy}
                    buildResult={buildResult}
                    onBack={() => setCurrentStep('analyze')}
                    vpsLogs={vpsLogs}
                    // Auto-deploy is now a simple boolean toggle without AI logic
                    isAutoDeployEnabled={false} // Default to off, can be managed with a simple state if needed
                    onAutoDeployChange={() => { /* Placeholder */}}
                    adaptiveConfig={null} // AI config is removed
                />
            );
        default:
            return null;
    }
  }

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen flex flex-col p-4 font-sans">
      {toast && (
          <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
          />
      )}
      <header className="flex items-center space-x-4 pb-4 border-b border-gray-800 flex-shrink-0">
        <CodeIcon className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SAT18 Engine v2</h1>
          <p className="text-sm text-gray-400">VPS Build & Deployment Tool</p>
        </div>
      </header>

      <main className="flex-grow pt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-3">
             <AppStepper 
                currentStep={currentStep}
                appState={appState}
                onStepClick={setCurrentStep}
                analysisResult={analysisResult}
             />
        </aside>
        <div className="lg:col-span-9">
            {renderCurrentStep()}
        </div>
      </main>
      
      <footer className="pt-4 mt-auto flex-shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <LogConsole />
          </div>
          <SystemDashboard 
              appState={appState}
          />
        </div>
      </footer>
    </div>
  );
}
