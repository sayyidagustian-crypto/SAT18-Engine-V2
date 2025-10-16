import React from 'react';
import type { AnalysisResult, FileAnalysis, DirectoryTree } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { FileIcon } from './icons/FileIcon';

interface AnalysisResultsProps {
  isLoading: boolean;
  analysisResult: AnalysisResult | null;
  error: string | null;
}

const buildTree = (files: FileAnalysis[]): DirectoryTree => {
  const tree: DirectoryTree = {};
  files.forEach(file => {
    if (!file.suggestedPath.includes('/')) {
        tree[file.suggestedPath] = file;
        return;
    }
    const pathParts = file.suggestedPath.split('/');
    let currentLevel = tree;
    pathParts.forEach((part, index) => {
      if (index === pathParts.length - 1) {
        currentLevel[part] = file;
      } else {
        currentLevel[part] = currentLevel[part] || {};
        currentLevel = currentLevel[part] as DirectoryTree;
      }
    });
  });
  return tree;
};

const TreeView = ({ tree, level = 0 }: { tree: DirectoryTree; level?: number }) => {
   const sortedEntries = Object.entries(tree).sort(([aName, aValue], [bName, bValue]) => {
    const aIsFile = 'originalPath' in aValue;
    const bIsFile = 'originalPath' in bValue;
    if (aIsFile && !bIsFile) return 1;
    if (!aIsFile && bIsFile) return -1;
    return aName.localeCompare(bName);
  });

  return (
    <div>
      {sortedEntries.map(([name, node]) => {
          const isFile = 'originalPath' in node;
          const fileNode = node as FileAnalysis;
          const directoryNode = node as DirectoryTree;

          return (
            <div key={name} style={{ paddingLeft: `${level * 20}px` }}>
              {isFile ? (
                 <div className="group flex items-start text-sm my-1 font-mono text-gray-300 relative py-1">
                    <FileIcon className="h-4 w-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                    <span>{name} <span className="text-gray-500 text-xs">- ({fileNode.language})</span></span>
                    <div className="absolute left-full ml-4 w-64 z-10 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-lg">
                        <p><strong className="text-white">Original:</strong> {fileNode.originalPath}</p>
                        <p className="mt-2"><strong className="text-white">Reasoning:</strong> <span className="text-gray-400">{fileNode.reasoning}</span></p>
                    </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center text-sm my-1 font-mono text-gray-200">
                    <FolderIcon className="h-4 w-4 mr-2 text-cyan-400 flex-shrink-0" />
                    <strong>{name}</strong>
                  </div>
                  <TreeView tree={directoryNode} level={level + 1} />
                </>
              )}
            </div>
          );
        })}
    </div>
  );
};


export function AnalysisResults({ isLoading, analysisResult, error }: AnalysisResultsProps): React.ReactElement {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <svg className="animate-spin h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <h3 className="mt-4 text-lg font-semibold text-white">Analyzing Project...</h3>
          <p className="text-gray-400">The engine is detecting languages and structuring files.</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h3 className="mt-4 text-lg font-semibold text-red-300">Analysis Failed</h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      );
    }
    if (analysisResult) {
      const tree = buildTree(analysisResult.files);
      return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4 font-mono text-sm">
                <p>
                    <span className="text-gray-500">Framework:</span>
                    <span className="text-cyan-400 font-semibold ml-2">{analysisResult.detectedFramework || 'Not Detected'}</span>
                </p>
                 <p className="mt-1">
                    <span className="text-gray-500">Entry Point:</span>
                    <span className="text-gray-300 ml-2">{analysisResult.entryPoint || 'Not Found'}</span>
                </p>
            </div>
            <div className="flex-grow bg-gray-900 p-4 rounded-lg border border-gray-800 overflow-auto">
                <TreeView tree={tree} />
            </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-400">Awaiting Analysis</h3>
        <p className="text-gray-600">Upload your project files to see the suggested structure.</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 h-full flex flex-col animate-fade-in">
      <h2 className="text-xl font-semibold text-white mb-4">2. Analyze Project</h2>
      <div className="flex-grow min-h-[300px]">
        {renderContent()}
      </div>
    </div>
  );
}