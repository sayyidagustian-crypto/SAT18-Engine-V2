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