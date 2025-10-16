import { useEffect, useState } from "react";
import { Logger, LogEntry } from "../modules/logger";

export const useLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>(Logger.getLogs());

  useEffect(() => {
    const unsubscribe = Logger.onUpdate(setLogs);
    return () => unsubscribe();
  }, []);

  return { logs, clearLogs: Logger.clear };
};

// FIX: Export LogEntry type to be available for other modules.
export type { LogEntry };
