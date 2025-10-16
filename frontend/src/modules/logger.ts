type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

let listeners: ((logs: LogEntry[]) => void)[] = [];
let logs: LogEntry[] = [];
const MAX_LOGS = 50;

export const Logger = {
  log(level: LogLevel, message: string) {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      level,
      message,
    };
    logs = [...logs, entry].slice(-MAX_LOGS); // Add new log and cap the array size
    listeners.forEach((fn) => fn([...logs]));
    
    // Also log to the browser console for debugging
    switch(level) {
        case 'success': console.log(`%c[${entry.time}] ${message}`, 'color: #22c55e'); break;
        case 'warning': console.warn(`[${entry.time}] ${message}`); break;
        case 'error': console.error(`[${entry.time}] ${message}`); break;
        default: console.info(`[${entry.time}] ${message}`); break;
    }
  },

  onUpdate(fn: (logs: LogEntry[]) => void) {
    listeners.push(fn);
    // Immediately provide the current logs to the new listener
    fn([...logs]);
    return () => {
      // Cleanup function to remove the listener
      listeners = listeners.filter(l => l !== fn);
    };
  },

  clear() {
    logs = [];
    listeners.forEach((fn) => fn([]));
  },

  getLogs(): LogEntry[] {
    return [...logs];
  }
};