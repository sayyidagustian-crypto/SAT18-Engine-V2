import { useState, useCallback } from 'react';
import { Logger } from '../modules/logger';

// A simple in-memory cache for hashes to avoid re-hashing during the same session
const hashCache = new Map<string, string>();

async function getFileHash(file: File): Promise<string> {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    if (hashCache.has(fileId)) {
        return hashCache.get(fileId)!;
    }

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    hashCache.set(fileId, hashHex);
    return hashHex;
}

const CACHE_KEY = 'sat18-file-cache';

function getCachedFiles(): Record<string, string> {
    try {
        const item = localStorage.getItem(CACHE_KEY);
        return item ? JSON.parse(item) : {};
    } catch (error) {
        console.error("Error reading file cache from localStorage", error);
        return {};
    }
}

function setCachedFiles(cache: Record<string, string>) {
     try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error("Error writing file cache to localStorage", error);
    }
}

export const useFileCache = () => {
    // Stores a map of filename -> hash for files that are cached
    const [fileCache, setFileCache] = useState<Record<string, string>>({});
    
    // Checks a list of files against the stored cache
    const checkFiles = useCallback(async (files: File[]) => {
        const storedCache = getCachedFiles();
        const newCacheState: Record<string, string> = {};
        const updatedStoredCache = { ...storedCache };
        let filesHashed = 0;

        Logger.log('info', 'Checking file cache...')
        for (const file of files) {
            const hash = await getFileHash(file);
            if (storedCache[file.name] === hash) {
                newCacheState[file.name] = hash;
            }
            // Always update the stored cache with the latest hash
            updatedStoredCache[file.name] = hash;
            filesHashed++;
        }
        
        setFileCache(newCacheState);
        setCachedFiles(updatedStoredCache);
        Logger.log('info', `Cache check complete. Hashed ${filesHashed} files.`)
    }, []);
    
    return { fileCache, checkFiles };
};
