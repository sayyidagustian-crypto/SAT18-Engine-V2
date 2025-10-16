import type { UploadedFile, FileAnalysis, AnalysisResult } from '../types';

const getFileExtension = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return fileName.substring(lastDotIndex).toLowerCase();
}

const detectFileType = (fileName:string): string => {
  const ext = getFileExtension(fileName);
  const map: { [key: string]: string } = {
    ".js": "JavaScript", ".mjs": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".html": "HTML",
    ".css": "CSS",
    ".py": "Python",
    ".php": "PHP",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".scss": "SASS",
    ".sass": "SASS",
  };
  return map[ext] || "Unknown";
}

const suggestFolder = (fileName: string, framework: string | null): string => {
  // Jekyll-specific folder suggestions for loose files
  if (framework === 'Jekyll') {
      const ext = getFileExtension(fileName);
      if (['.scss', '.sass'].includes(ext)) return '_sass';
      if (['.css', '.js', '.png', '.jpg', '.svg', '.gif'].includes(ext)) return 'assets';
      if (['.md', '.markdown'].includes(ext) && !fileName.startsWith('index')) return '_posts';
  }

  // Fallback to original logic for other frameworks or uncategorized Jekyll files
  const type = detectFileType(fileName);
  if (["JavaScript", "TypeScript", "HTML", "CSS"].includes(type)) return "src";
  if (["Python", "PHP"].includes(type)) return "api";
  if (type === "JSON" && !['package.json', 'tsconfig.json'].includes(fileName)) return "config";
  
  const rootFiles = ['package.json', 'tsconfig.json', '.gitignore', 'readme.md', 'vite.config.ts', 'next.config.js', '_config.yml', 'gemfile', 'gemfile.lock'];
  if(rootFiles.includes(fileName.toLowerCase())) {
    return ".";
  }

  return "lib"; // Default fallback
}


const detectFramework = (files: UploadedFile[]): string | null => {
    const filePaths = files.map(f => f.name.toLowerCase());
    const fileNamesOnly = filePaths.map(p => p.split('/').pop() || p);

    // Jekyll check (high priority)
    const hasConfigFile = fileNamesOnly.includes('_config.yml');
    const hasSpecialFolders = filePaths.some(path => path.startsWith('_posts/') || path.startsWith('_layouts/') || path.startsWith('_includes/'));
    if (hasConfigFile || hasSpecialFolders) {
        return 'Jekyll';
    }

    // JS frameworks check
    const packageJsonFile = files.find(f => f.name.endsWith('package.json'));
    if (packageJsonFile?.content) {
        try {
            const pkg = JSON.parse(packageJsonFile.content);
            const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
            if (dependencies.react) return 'React';
            if (dependencies.vue) return 'Vue';
            if (dependencies.svelte) return 'Svelte';
            if (dependencies.next) return 'Next.js';
            if (dependencies.vite) return 'Vite';
            if (dependencies.flutter) return 'Flutter';
            return 'Node.js'; // Default if other web frameworks aren't found
        } catch { /* ignore parse error */ }
    }
    
    return null; // No framework detected
};

const findEntryPoint = (files: UploadedFile[], packageJsonContent: string | null, framework: string | null): string | null => {
    if (framework === 'Jekyll') {
        const jekyllEntries = ['index.html', 'index.md'];
        for(const entry of jekyllEntries) {
            if (files.some(f => f.name.split('/').pop() === entry)) return entry;
        }
    }

    // Standard entry points for JS frameworks
    const commonEntries = ['src/main.tsx', 'src/main.ts', 'src/index.tsx', 'src/index.ts', 'src/index.js', 'app/page.tsx', 'pages/index.tsx'];
    for (const entry of commonEntries) {
        if (files.some(f => f.name === entry)) {
            return entry;
        }
    }
    // Check package.json "main" or "module" field
    if(packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent);
        return pkg.main || pkg.module || null;
      } catch { /* ignore parsing errors */ }
    }
    return null;
}

// The main exported function, using your local logic.
export function analyzeProject(files: UploadedFile[]): Omit<AnalysisResult, 'summary'> {
    const detectedFramework = detectFramework(files);
    const packageJsonFile = files.find(f => f.name.endsWith('package.json'));
    const packageJsonContent = packageJsonFile?.content ?? null;
    const entryPoint = findEntryPoint(files, packageJsonContent, detectedFramework);

    const fileAnalyses: FileAnalysis[] = files.map(file => {
        const language = detectFileType(file.name);
        
        // Preserve key Jekyll directory structures
        if (detectedFramework === 'Jekyll') {
            const jekyllFoldersToPreserve = ['_posts', '_layouts', '_includes', '_data', '_sass', 'assets', '_drafts'];
            const pathParts = file.name.split('/');
            if (jekyllFoldersToPreserve.includes(pathParts[0])) {
                return {
                    originalPath: file.name,
                    suggestedPath: file.name, // Keep as is
                    language,
                    reasoning: `Preserved in standard Jekyll directory '${pathParts[0]}'.`
                };
            }
        }
        
        // For loose files or other frameworks, organize them
        const baseName = file.name.split('/').pop() || file.name;
        const suggestedDir = suggestFolder(baseName, detectedFramework);
        const suggestedPath = suggestedDir === '.' ? baseName : `${suggestedDir}/${baseName}`;
        
        return {
            originalPath: file.name,
            suggestedPath,
            language,
            reasoning: `Based on detected framework (${detectedFramework || 'Generic'}), file placed in '${suggestedDir}'.`
        };
    });

    return {
      files: fileAnalyses,
      detectedFramework,
      entryPoint
    }
}