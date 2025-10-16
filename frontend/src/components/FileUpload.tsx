import React, { useState, useCallback, useRef } from 'react';
import type { UploadedFile } from '../types';
import { FileIcon } from './icons/FileIcon';
import { useFileCache } from '../hooks/useFileCache';

interface FileUploadProps {
  onAnalyze: (files: UploadedFile[]) => void;
  isLoading: boolean;
  hasAnalysis: boolean;
  onReset: () => void;
}

export function FileUpload({ onAnalyze, isLoading, hasAnalysis, onReset }: FileUploadProps): React.ReactElement {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { fileCache, checkFiles } = useFileCache();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSelectedFiles = useCallback(async (files: File[]) => {
      setSelectedFiles(files);
      await checkFiles(files);
  }, [checkFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      updateSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      updateSelectedFiles(Array.from(event.dataTransfer.files));
      event.dataTransfer.clearData();
    }
  }, [updateSelectedFiles]);

  const handleAnalyzeClick = async () => {
    const filePromises = selectedFiles.map(file => {
      return new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve({ name: file.name, content: e.target.result as string, file });
          } else {
            reject(new Error(`Failed to read file: ${file.name}`));
          }
        };
        reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
        reader.readAsText(file, 'UTF-8');
      });
    });

    try {
      const uploadedFiles = await Promise.all(filePromises);
      onAnalyze(uploadedFiles);
    } catch (error) {
      console.error(error);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  if (hasAnalysis) {
     return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 h-full flex flex-col justify-center items-center text-center animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-2">1. Files Ready for Processing</h2>
            <p className="text-gray-400 mb-6">{`${selectedFiles.length} files have been loaded.`}</p>
            <p className="text-gray-400 mb-6">Proceed to Analysis to view the proposed structure.</p>
            <button
                onClick={onReset}
                className="w-full max-w-xs bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
                Start New Analysis
            </button>
        </div>
     );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 flex flex-col h-full animate-fade-in">
      <h2 className="text-xl font-semibold text-white mb-4">1. Upload Project Files</h2>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`flex-grow flex flex-col justify-center items-center border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
          isDragging ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-center p-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <p className="mt-2 text-gray-400">
            <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">Select all individual files for your project</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-white mb-3">Selected Files ({selectedFiles.length})</h3>
          <div className="max-h-48 overflow-y-auto bg-gray-900 p-3 rounded-lg border border-gray-800 space-y-2">
            {selectedFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between text-sm text-gray-300 font-mono">
                <div className="flex items-center truncate">
                    <FileIcon className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                </div>
                {fileCache[file.name] && (
                    <span className="text-xs text-green-400 bg-green-900/50 px-2 py-0.5 rounded-full ml-2">
                        Cached ✅
                    </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-auto pt-6">
        <button
          onClick={handleAnalyzeClick}
          disabled={selectedFiles.length === 0 || isLoading}
          className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Project'}
        </button>
      </div>
    </div>
  );
}