import { Outlet, Link, useLocation } from "react-router-dom";
import { Activity, Settings } from "lucide-react"; // アイコン

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Monitor", icon: Activity },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-8 px-2 tracking-tight text-blue-400">
          VRCP Monitor
        </h1>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
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
    </div>
  );
}
