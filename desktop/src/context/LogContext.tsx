import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { events, commands, type LogPayload } from "../generated/bindings";

interface LogContextType {
  logs: LogPayload[];
  serverUrl: string;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogPayload[]>([]);
  const [serverUrl, setServerUrl] = useState<string>("");

  useEffect(() => {
    // 1. サーバーURL取得
    const refreshUrl = () => {
      commands.getServerUrl().then((result) => {
        if (result.status === "ok") {
          setServerUrl(result.data);
        } else {
          console.error("Failed to get server URL:", result.error);
        }
      }).catch(console.error);
    }
    const unsubscribe = setInterval(refreshUrl, 30 * 1000)
    refreshUrl();

    // 2. ログ監視開始
    const unlistenPromise = events.logPayload.listen((event) => {
      setLogs((prev) => [...prev, event.payload]);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      clearInterval(unsubscribe);
    };
  }, []);

  const clearLogs = () => setLogs([]);

  return (
    <LogContext.Provider value={{ logs, serverUrl, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogContext() {
  const context = useContext(LogContext);
  if (!context) throw new Error("useLogContext must be used within a LogProvider");
  return context;
}
