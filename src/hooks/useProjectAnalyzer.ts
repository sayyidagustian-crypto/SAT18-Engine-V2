import { useState, useCallback } from 'react';
import { Logger } from '../modules/logger';
import { analyzeProject } from '../services/analyzerService';
import type { UploadedFile, AnalysisResult } from '../types';

export const useProjectAnalyzer = () => {
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    const analyze = useCallback(async (files: UploadedFile[]) => {
        Logger.log('info', `Starting analysis of ${files.length} files...`);
        setAnalysisResult(null);
        setAnalysisError(null);
        
        try {
            const analysis = analyzeProject(files);
            const summary = `Successfully analyzed ${files.length} files. The proposed structure organizes files based on the detected project type.`;
            
            const result: AnalysisResult = {
                summary,
                ...analysis
            };
            
            setAnalysisResult(result);
            Logger.log('success', `Project analysis complete. Detected framework: ${result.detectedFramework || 'N/A'}`);
        } catch (e) {
            const error = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
            setAnalysisError(error);
            Logger.log('error', `Analysis failed: ${error}`);
        }
    }, []);

    const clear = useCallback(() => {
        setAnalysisResult(null);
        setAnalysisError(null);
    }, []);
    
    return {
        analysisResult,
        analysisError,
        analyzeProject: analyze,
        clearAnalysis: clear
    };
};
