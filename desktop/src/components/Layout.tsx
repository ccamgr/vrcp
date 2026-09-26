import { Outlet, Link, useLocation } from "react-router-dom";
import { Activity, Settings, BarChart3, Home, LogIn, UserCircle } from "lucide-react"; // アイコン
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import LoginDialog from "./LoginDialog";

export default function Layout() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Top", icon: Home },
    { path: "/monitor", label: "Monitor", icon: Activity },
    { path: "/history", label: "History", icon: BarChart3 },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-4">
        <div className="mb-8 flex items-center justify-between gap-2 px-2">
          <h1 className="text-xl font-bold tracking-tight text-blue-400">
            VRCP Desktop
          </h1>
          {!isLoading &&
            (user ? (
              user.iconUrl ? (
                <img
                  src={user.iconUrl}
                  alt={user.displayName}
                  title={user.displayName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <UserCircle
                  size={28}
                  className="text-slate-300"
                  aria-label={user.displayName}
                />
              )
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginDialogOpen(true)}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-500"
              >
                <LogIn size={14} />
                Login
              </button>
            ))}
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-600 text-center">v0.1.0 Alpha</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Outlet />
      </div>
      <LoginDialog
        open={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
      />
    </div>
  );
}
