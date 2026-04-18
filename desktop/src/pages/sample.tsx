import React, { useState } from "react";
import { commands } from "../generated/bindings";

export default function Sample() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [statusLog, setStatusLog] = useState<string>("Ready.");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Handle login process
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setStatusLog("Error: Username and password are required.");
      return;
    }

    setStatusLog("Logging in...");

    const result = await commands.login(username, password);

    if (result.status === "ok") {
      if (result.data.requires2fa) {
        setStatusLog(`2FA Required. Available types: ${result.data.type2fa.join(", ")}`);
        setCurrentUser(null);
      } else {
        setStatusLog(`Login Success! User: ${result.data.user}`);
        setCurrentUser(result.data.user);
      }
    } else {
      setStatusLog(`Login Failed: ${result.error}`);
      setCurrentUser(null);
    }
  };

  // Handle logout process
  const handleLogout = async () => {
    setStatusLog("Logging out...");

    const result = await commands.logout();

    if (result.status === "ok") {
      setStatusLog("Logout Success.");
      setCurrentUser(null);
    } else {
      setStatusLog(`Logout Failed: ${result.error}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <header className="flex justify-between items-center p-6 border-b border-slate-800">
        <h2 className="text-2xl font-bold">VRChat Auth Test</h2>
        {currentUser && (
          <span className="text-sm bg-green-900/50 text-green-400 px-3 py-1 rounded-full border border-green-800/50">
            Logged in: {currentUser}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Auth Form Area */}
        <div className="bg-slate-800/50 p-6 rounded-xl shadow-inner border border-slate-700/50 max-w-md w-full mx-auto">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Username / Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>

            <div className="flex gap-4 mt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Login
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </form>
        </div>

        {/* Log/Result Display Area */}
        <div className="bg-slate-950 rounded-xl shadow-inner border border-slate-800 font-mono text-sm p-4 h-48 overflow-y-auto">
          <div className="text-slate-500 mb-2">// Status Log</div>
          <div className={statusLog.includes("Error") || statusLog.includes("Failed") ? "text-red-400" : "text-emerald-400"}>
            {statusLog}
          </div>
        </div>
      </div>
    </div>
  );
}
