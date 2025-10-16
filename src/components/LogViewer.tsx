import React, { useEffect, useRef } from "react";
import type { VpsLogEntry } from '../types';

export const LogViewer: React.FC<{ logs: VpsLogEntry[] }> = ({ logs }) => {
  const refEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    refEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const colorFor = (level?: string) => {
    switch ((level||"").toLowerCase()) {
      case "error": return "text-red-400";
      case "warn":
      case "warning": return "text-yellow-300";
      case "success": return "text-green-300";
      case "info": return "text-blue-300";
      default: return "text-gray-300";
    }
  };

  return (
    <div>
        <h3 className="text-lg font-semibold text-white mb-2">🔒 VPS Deployment Log Stream</h3>
        <div className="bg-black/50 text-xs font-mono text-gray-200 p-3 h-48 overflow-y-auto rounded border border-gray-700">
        {logs.length > 0 ? (
            logs.map((l) => (
                <div key={l.id} className="mb-1 flex items-start">
                  <span className="w-20 inline-block text-gray-500 mr-2 flex-shrink-0">
                    {l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "--:--:--"}
                  </span>
                  <span className={`${colorFor(l.level)} mr-2 font-bold`}>[{(l.level||"INFO").toUpperCase()}]</span>
                  <span className="whitespace-pre-wrap">{l.text}</span>
                </div>
            ))
        ) : (
            <p className="text-gray-500 italic">Awaiting encrypted log stream from server...</p>
        )}
        <div ref={refEnd} />
        </div>
    </div>
  );
};
