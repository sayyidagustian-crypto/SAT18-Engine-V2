import { useState, useEffect } from 'react';
import type { ClientSystemInfo, VpsSystemInfo, VpsStatus, VpsHealthResponse } from '../types';

function getClientSystemInfo(): ClientSystemInfo {
  let ram = "N/A";

  if ('memory' in performance && (performance as any).memory) {
    const mem = (performance as any).memory;
    if (mem.totalJSHeapSize > 0) {
        ram = ((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100).toFixed(2) + "%";
    }
  }

  return {
    online: navigator.onLine ? "🟢 ONLINE" : "🔴 OFFLINE",
    ramUsage: ram,
    uptime: (performance.now() / 1000 / 60).toFixed(1) + " menit",
  };
}

async function getVpsHealth(): Promise<VpsHealthResponse & { vpsStatus: VpsStatus }> {
    if (!navigator.onLine) {
        return { status: 'offline', vpsStatus: 'offline', isAiEnabled: false };
    }
    try {
        // In the new monorepo structure, this endpoint is proxied.
        const response = await fetch("/api/health", { method: "GET", cache: "no-cache" });
        if (response.ok) {
            const data: VpsHealthResponse = await response.json();
            // Ensure loadAvg is always an array
            if (data.system && !Array.isArray(data.system.loadAvg)) {
                data.system.loadAvg = [0, 0, 0];
            }
            return { ...data, vpsStatus: 'online' };
        }
        return { status: 'error', vpsStatus: 'offline', isAiEnabled: false };
    } catch (error) {
        return { status: 'error', vpsStatus: 'offline', isAiEnabled: false };
    }
}

export const useSystemMonitor = () => {
  const [clientInfo, setClientInfo] = useState<ClientSystemInfo>(getClientSystemInfo());
  const [vpsInfo, setVpsInfo] = useState<VpsSystemInfo | null>(null);
  const [vpsStatus, setVpsStatus] = useState<VpsStatus>('checking');
  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Client monitor interval
    const clientInterval = setInterval(() => {
      setClientInfo(getClientSystemInfo());
    }, 3000);

    // VPS monitor interval
    const checkVps = async () => {
      const { vpsStatus: newStatus, system, isAiEnabled: aiStatus } = await getVpsHealth();
      setVpsStatus(newStatus);
      setIsAiEnabled(aiStatus);
      if (system) {
        setVpsInfo(system);
      } else {
        setVpsInfo(null);
      }
    };
    
    checkVps(); // Initial check
    const vpsInterval = setInterval(checkVps, 15000); // Check every 15 seconds for faster updates for Adaptive Tuner

    return () => {
      clearInterval(clientInterval);
      clearInterval(vpsInterval);
    };
  }, []);

  return { clientInfo, vpsInfo, vpsStatus, isAiEnabled };
};
