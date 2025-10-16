import React from 'react';
import type { AppStep, AppState, AnalysisResult } from '../types';

interface AppStepperProps {
    currentStep: AppStep;
    appState: AppState;
    analysisResult: AnalysisResult | null;
    onStepClick: (step: AppStep) => void;
}

const Step: React.FC<{
    stepId: AppStep;
    title: string;
    number: number;
    isActive: boolean;
    isCompleted: boolean;
    isClickable: boolean;
    onClick: () => void;
}> = ({ stepId, title, number, isActive, isCompleted, isClickable, onClick }) => {

    const getStatusClasses = () => {
        if (isActive) {
            return 'border-cyan-500 bg-cyan-900/30 text-white';
        }
        if (isCompleted) {
            return 'border-green-500 bg-green-900/20 text-gray-300';
        }
        return 'border-gray-700 bg-gray-900/50 text-gray-500';
    };
    
    const getNumberClasses = () => {
        if(isActive) return 'bg-cyan-500 text-black';
        if(isCompleted) return 'bg-green-500 text-white';
        return 'bg-gray-700 text-gray-400'
    }

    return (
        <button 
            onClick={onClick}
            disabled={!isClickable}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-4 ${getStatusClasses()} ${isClickable ? 'cursor-pointer hover:border-cyan-400' : 'cursor-default'}`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getNumberClasses()}`}>
                {isCompleted && !isActive ? '✓' : number}
            </div>
            <div>
                 <p className="font-semibold">{title}</p>
                 <p className={`text-xs ${isActive || isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isActive ? "Current Step" : isCompleted ? "Completed" : "Pending"}
                 </p>
            </div>
        </button>
    );
}

export const AppStepper: React.FC<AppStepperProps> = ({ currentStep, appState, analysisResult, onStepClick }) => {
    
    const steps: { id: AppStep; title: string; }[] = [
        { id: 'upload', title: 'Upload Files' },
        { id: 'analyze', title: 'Analyze Project' },
        { id: 'build', title: 'Build & Deploy' }
    ];

    const stepStatus = {
        upload: { completed: analysisResult !== null || currentStep !== 'upload', clickable: true },
        analyze: { completed: currentStep === 'build', clickable: analysisResult !== null },
        build: { completed: appState === 'success', clickable: currentStep === 'build' || (analysisResult !== null && currentStep === 'analyze') }
    };

    return (
        <div className="space-y-3 h-full bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            {steps.map((step, index) => (
                <Step 
                    key={step.id}
                    stepId={step.id}
                    title={step.title}
                    number={index + 1}
                    isActive={currentStep === step.id}
                    isCompleted={stepStatus[step.id].completed}
                    isClickable={stepStatus[step.id].clickable}
                    onClick={() => onStepClick(step.id)}
                />
            ))}
        </div>
    );
};