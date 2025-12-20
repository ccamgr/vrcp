// desktop/src/App.tsx

import { useEffect, useState } from "react";
import "./App.css"; // 必要ならスタイル定義
import { fetchNewLogs, greet, LogEntry } from "./lib/commands-wrapper";

function App() {
  // ログのリストを保持するState
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [greetMessage, setGreetMessage] = useState<string>("greet me!");

  // コンポーネントが表示されたら定期実行を開始
  useEffect(() => {
    // 2秒ごとに実行するタイマー
    const intervalId = setInterval(async () => {
      const newEntries = await fetchNewLogs();
      
      if (newEntries.length > 0) {
        // 新しいログがあれば、既存のリストの後ろに追加
        setLogs((prev) => [...newEntries.reverse(), ...prev, ]);
      }
    }, 2000); 

    // 画面が閉じられたらタイマーを解除（メモリリーク防止）
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="container">
      <h1>VRChat Log Monitor 📜</h1>
      
      <div className="controls">
        <button onClick={async () => setGreetMessage(await greet(new Date().toISOString()))}>{greetMessage}</button>
      </div>

      <div className="controls">
        <p>Total Logs: {logs.length}</p>
        <button onClick={() => setLogs([])}>Clear Log</button>
      </div>

      <div className="log-container">
        {logs.length === 0 ? (
          <p className="no-logs">Waiting for logs...</p>
        ) : (
          /* ログのリストを表示 */
          logs.map((log, index) => (
            <div key={index} className={`log-item ${log.log_type.toLowerCase()}`}>
              <span className="time">[{log.timestamp}]</span>
              <span className="type">{log.log_type}</span>
              <span className="content">{log.content}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;