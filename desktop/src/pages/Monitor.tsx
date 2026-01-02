import { useEffect, useRef } from "react";
import { useLogContext } from "../context/LogContext";
import { type VrcLogEvent } from "../lib/bindings";

export default function Monitor() {
  const { logs, clearLogs } = useLogContext();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // イベント整形ヘルパー (変更なし)
  const getEventContent = (event: VrcLogEvent) => {
    switch (event.type) {
      case "AppStart": return { color: "text-green-500", text: "--- VRChat Started ---" };
      case "AppStop": return { color: "text-red-500", text: "--- VRChat Stopped ---" };
      case "Login": return { color: "text-blue-400", text: `Login: ${event.data.username}` };
      case "WorldEnter": return { color: "text-yellow-400", text: `World: ${event.data.world_name}` };
      case "InstanceJoin": return { color: "text-orange-400", text: `Instance: ${event.data.instance_id}` };
      case "PlayerJoin": return { color: "text-cyan-400", text: `[+] ${event.data.player_name}` };
      case "PlayerLeft": return { color: "text-gray-400", text: `[-] ${event.data.player_name}` };
      default: return { color: "text-white", text: JSON.stringify(event) };
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Realtime Logs</h2>
        <div className="flex gap-4 text-sm text-slate-400">
          <span>Total: {logs.length}</span>
          <button onClick={clearLogs} className="hover:text-red-400 transition">Clear</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-800/50 rounded-xl p-4 shadow-inner border border-slate-700/50 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            Running... Waiting for logs.
          </div>
        ) : (
          logs.map((log, index) => {
            const { color, text } = getEventContent(log.event);
            return (
              <div key={index} className="flex mb-1 border-b border-slate-700/30 pb-1 hover:bg-slate-700/30">
                <span className="text-slate-500 mr-4 select-none w-36 shrink-0 text-xs py-0.5">{log.timestamp}</span>
                <span className={`font-bold mr-3 w-28 shrink-0 text-xs py-0.5 ${color}`}>{log.event.type}</span>
                <span className="break-all text-slate-200">{text}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
