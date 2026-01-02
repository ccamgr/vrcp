import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { commands } from "../lib/bindings";
import { useLogContext } from "../context/LogContext";
// Globe アイコンを追加
import { Smartphone, Power, Globe } from "lucide-react";

export default function Settings() {
  const { serverUrl } = useLogContext();
  const [autoStart, setAutoStart] = useState(false);
  const [portInput, setPortInput] = useState<string | null>(null);

  useEffect(() => {
    // 自動起動設定の確認
    isEnabled().then(setAutoStart).catch(console.error);
  }, []);

  // serverUrl (例: http://192.168.1.5:8727) がロードされたら、そこからポート番号を抽出して入力欄に反映
  useEffect(() => {
    if (serverUrl) {
      const match = serverUrl.match(/:(\d+)$/);
      if (match) {
        setPortInput(match[1]);
      }
    }
  }, [serverUrl]);

  const toggleAutoStart = async () => {
    try {
      if (autoStart) {
        await disable();
        setAutoStart(false);
      } else {
        await enable();
        setAutoStart(true);
      }
    } catch (e) {
      alert("Failed to update settings");
    }
  };

  const handleSavePort = async () => {
    const portNum = parseInt(portInput ?? "", 10);

    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      alert("有効なポート番号(1-65535)を入力してください");
      return;
    }

    try {
      await commands.setServerPort(portNum);
      alert("ポート設定を保存しました。\n反映するにはアプリを再起動してください。");
    } catch (e) {
      console.error(e);
      alert(`保存に失敗しました: ${e}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full overflow-y-auto font-sans">
      <h2 className="text-3xl font-bold mb-8 border-b border-slate-700 pb-4">Settings</h2>

      <div className="grid gap-8">


        {/* Mobile Connection */}
        <section className="bg-slate-800/40 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="text-green-400" /> Mobile Connection
          </h3>
          <div className="flex gap-8 items-start">
            <div className="bg-white p-2 rounded-lg shrink-0">
              {serverUrl ? <QRCode value={serverUrl} size={120} /> : <div className="w-[120px] h-[120px] bg-gray-200 animate-pulse rounded" />}
            </div>
            <div>
              <p className="font-medium mb-1">Scan this QR Code</p>
              <p className="text-sm text-slate-400 mb-4">
                Connect your mobile app to this PC by scanning the code above.
                Ensure both devices are on the same Wi-Fi.
              </p>
              <code className="bg-slate-950 px-3 py-1 rounded text-xs font-mono text-slate-300 block w-fit">
                {serverUrl || "Fetching IP..."}
              </code>
            </div>
          </div>
        </section>

        {/* System Settings */}
        <section className="bg-slate-800/40 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Power className="text-blue-400" /> System
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto Start</p>
              <p className="text-sm text-slate-400">Launch VRCP automatically when PC starts.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={autoStart} onChange={toggleAutoStart} />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </section>



        {/* Network Settings (Port) */}
        <section className="bg-slate-800/40 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="text-purple-400" /> Network
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Server Port</p>
              <p className="text-sm text-slate-400">
                Change the listening port for mobile connection. <br />
                <span className="text-yellow-500 text-xs">Note: App restarts automatically to apply change.</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={portInput ?? ""}
                onChange={(e) => setPortInput(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded px-3 py-2 w-24 text-center font-mono focus:outline-none focus:border-blue-500 transition"
              // placeholder="8727"
              />
              <button
                onClick={handleSavePort}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-blue-900/20 font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </section>


      </div>
    </div>
  );
}
