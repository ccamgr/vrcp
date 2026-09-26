import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { commands } from "../generated/bindings";
import { useLogContext } from "../context/LogContext";
import { useAuth } from "../context/AuthContext";
import {
  confirmDeleteAllLogs,
  getAutostartEnabled,
  selectJsonExportPath,
  setAutostartEnabled,
  showNativeMessage,
} from "../lib/native";
import {
  Smartphone,
  Power,
  Globe,
  Database,
  Download,
  Trash2,
  AlertTriangle,
  LogOut,
} from "lucide-react";

export default function Settings() {
  const { serverUrl } = useLogContext();
  const { user, logout } = useAuth();
  const [autoStart, setAutoStart] = useState(false);
  const [portInput, setPortInput] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    getAutostartEnabled().then(setAutoStart).catch(console.error);
  }, []);

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
      const enabled = !autoStart;
      await setAutostartEnabled(enabled);
      setAutoStart(enabled);
    } catch {
      await showNativeMessage("Failed to update settings");
    }
  };

  const handleSavePort = async () => {
    const portNum = parseInt(portInput ?? "", 10);

    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      await showNativeMessage("Please enter a valid port number (1-65535)");
      return;
    }

    try {
      const result = await commands.setServerPort(portNum);
      if (result.status === "error") {
        await showNativeMessage(`Failed to save: ${result.error}`);
        return;
      }
      await showNativeMessage("Port settings saved.");
    } catch (e) {
      console.error(e);
      await showNativeMessage(`Failed to save: ${e}`);
    }
  };

  const handleExport = async () => {
    try {
      const filePath = await selectJsonExportPath();

      if (!filePath) return;

      setIsProcessing(true);

      const result = await commands.exportLogs(filePath);

      if (result.status === "error") {
        await showNativeMessage(`Export failed: ${result.error}`);
        return;
      }
      await showNativeMessage(`Export successful!\nSaved ${result.data} records.`);
    } catch (e) {
      console.error(e);
      await showNativeMessage(`Export failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    const confirmed = await confirmDeleteAllLogs();

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const result = await commands.deleteAllLogs();
      if (result.status === "error") {
        await showNativeMessage(`Failed to clear database: ${result.error}`);
        return;
      }
      await showNativeMessage("Database cleared successfully.");
    } catch (e) {
      console.error(e);
      await showNativeMessage(`Failed to clear database: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      await showNativeMessage("Logged out successfully.");
    } catch (error) {
      console.error(error);
      await showNativeMessage(`Logout failed: ${error}`);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center p-6">
        <h2 className="text-2xl font-bold">Settings</h2>
      </header>

      <div className="grid gap-8 p-6 overflow-y-auto ">
        {/* Mobile Connection */}
        <section className="bg-slate-800/40 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Smartphone className="text-green-400" /> Mobile Connection
          </h3>
          <div className="flex gap-8 items-start">
            <div className="bg-white p-2 rounded-lg shrink-0">
              {serverUrl ? (
                <QRCode value={serverUrl} size={120} />
              ) : (
                <div className="w-[120px] h-[120px] bg-gray-200 animate-pulse rounded" />
              )}
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
              <p className="text-sm text-slate-400">
                Launch VRCP automatically when PC starts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoStart}
                onChange={toggleAutoStart}
              />
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
                <span className="text-yellow-500 text-xs">
                  Note: App restarts automatically to apply change.
                </span>
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

        {/* Data Management Section */}
        <section className="bg-slate-800/40 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Database className="text-yellow-400" /> Data Management
          </h3>

          <div className="space-y-6">
            {/* Export */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Download size={18} className="text-blue-400" /> Export Data
                </p>
                <p className="text-sm text-slate-400">
                  Save all logs to a JSON file for backup.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? "Processing..." : "Export JSON"}
              </button>
            </div>

            {/* Clear */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center gap-2 text-red-400">
                  <Trash2 size={18} /> Clear Database
                </p>
                <p className="text-sm text-slate-400">
                  Permanently delete all logs from the database.
                </p>
              </div>
              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                <AlertTriangle size={16} />
                Delete All
              </button>
            </div>
          </div>
        </section>

        {user && (
          <section className="bg-slate-800/40 p-6 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <LogOut className="text-red-400" /> Account
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-sm text-slate-400">
                  Remove the saved VRChat session from this device.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
