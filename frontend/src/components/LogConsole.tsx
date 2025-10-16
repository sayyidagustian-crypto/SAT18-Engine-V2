import React, { useState, useRef, useMemo, useEffect } from "react";
import { useLogger } from "../hooks/useLogger";
import type { LogEntry } from "../modules/logger";

const logColor = (level: string) => {
  switch (level) {
    case "success": return "text-green-400";
    case "warning": return "text-yellow-400";
    case "error": return "text-red-400";
    default: return "text-gray-300";
  }
};

const pathRegex = /(\/?[\w-]+\/)+[\w-]+\.\w+/g;

const LogLine = React.memo(({ log }: { log: LogEntry }) => {
    const parts = log.message.split(pathRegex);
    return (
        <div className={`flex items-start ${logColor(log.level)}`}>
            <span className="w-20 inline-block opacity-60 flex-shrink-0">[{log.time}]</span>
            <span className="flex-1 whitespace-pre-wrap">
                {parts.map((part, i) => 
                    pathRegex.test(part) ? (
                        <span key={i} className="underline decoration-dotted cursor-pointer">{part}</span>
                    ) : (
                        part
                    )
                )}
            </span>
        </div>
    )
});

export default function LogConsole() {
  const { logs, clearLogs } = useLogger();
  const [filter, setFilter] = useState('');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
        consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!filter) return logs;
    return logs.filter(log => log.message.toLowerCase().includes(filter.toLowerCase()));
  }, [logs, filter]);

  const handleCopy = () => {
    const logText = logs.map(l => `[${l.time}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-white">🧠 Smart Log Console</h2>
            <div className="flex items-center space-x-2">
                 <input
                    type="text"
                    placeholder="Filter logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button onClick={handleCopy} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Copy</button>
                <button onClick={clearLogs} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Clear</button>
            </div>
        </div>
        <div className="bg-black/50 text-gray-200 p-3 rounded-lg shadow-inner h-48 overflow-y-auto font-mono text-xs border border-gray-700 relative">
          {filteredLogs.length === 0 && <p className="text-gray-500 italic">Standby. Awaiting system activity...</p>}
          {filteredLogs.map((log, i) => (
            <LogLine key={i} log={log} />
          ))}
          <div ref={consoleEndRef} />
        </div>
    </div>
  );
}