import { Bell, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { commands, type AppNotification } from "../generated/bindings";
import { useAuth } from "../context/AuthContext";

const unwrap = <T,>(
  result: { status: "ok"; data: T } | { status: "error"; error: string },
) => {
  if (result.status === "error") {
    throw new Error(result.error);
  }
  return result.data;
};

const formatNotificationType = (notificationType: string) =>
  notificationType.replace(/([a-z])([A-Z])/g, "$1 $2");

const formatCreatedAt = (createdAt: string) => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString();
};

export default function Notifications() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      setNotifications(unwrap(await commands.getNotifications()));
    } catch (loadError) {
      console.error("Failed to load notifications", loadError);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setError(null);
      return;
    }
    void loadNotifications();
  }, [loadNotifications, user]);

  if (isAuthLoading) {
    return <div className="p-6 text-slate-400">Checking VRChat login...</div>;
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <Bell size={40} className="mx-auto mb-3 text-slate-500" />
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="mt-2 text-slate-400">Log in to view your VRChat notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between p-6">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="mt-1 text-sm text-slate-400">Your latest VRChat notifications.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadNotifications()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="overflow-y-auto px-6 pb-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Failed to load notifications: {error}
          </div>
        )}
        {isLoading && notifications.length === 0 ? (
          <div className="text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
            No notifications.
          </div>
        ) : (
          <div className="divide-y divide-slate-700 rounded-xl border border-slate-700 bg-slate-800/40">
            {notifications.map((notification) => (
              <article key={notification.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {notification.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      )}
                      <span className="font-medium capitalize">
                        {formatNotificationType(notification.type)}
                      </span>
                    </div>
                    {notification.senderUsername && (
                      <p className="mt-1 text-sm text-slate-300">
                        {notification.senderUsername}
                      </p>
                    )}
                    {notification.message && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
                        {notification.message}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">
                    {formatCreatedAt(notification.createdAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
