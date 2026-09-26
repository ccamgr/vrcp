import { useCallback, useEffect, useState } from "react";
import { MapPin, RefreshCw, Users } from "lucide-react";
import { commands, type FriendInstance } from "../generated/bindings";
import { useAuth } from "../context/AuthContext";

const unwrap = <T,>(
  result: { status: "ok"; data: T } | { status: "error"; error: string },
) => {
  if (result.status === "error") {
    throw new Error(result.error);
  }
  return result.data;
};

export default function Top() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [instances, setInstances] = useState<FriendInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    try {
      setInstances(unwrap(await commands.getFriendInstances()));
    } catch (loadError) {
      console.error("Failed to load friend instances", loadError);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setInstances([]);
      setError(null);
      return;
    }
    void loadInstances();
  }, [loadInstances, user]);

  if (isAuthLoading) {
    return <div className="p-6 text-slate-400">Checking VRChat login...</div>;
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <Users size={40} className="mx-auto mb-3 text-slate-500" />
          <h2 className="text-xl font-semibold">Friend Instances</h2>
          <p className="mt-2 text-slate-400">
            Log in from the sidebar to see where your friends are playing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between p-6">
        <div>
          <h2 className="text-2xl font-bold">Friend Instances</h2>
          <p className="mt-1 text-sm text-slate-400">
            Friends currently in joinable worlds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadInstances()}
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
            Failed to load friend instances: {error}
          </div>
        )}
        {isLoading && instances.length === 0 ? (
          <div className="text-slate-400">Loading friend instances...</div>
        ) : instances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
            None of your friends are currently in a joinable world.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {instances.map((instance) => (
              <section
                key={`${instance.worldId}:${instance.instanceId}`}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40"
              >
                <div className="flex gap-4 p-4">
                  {instance.worldThumbnailUrl ? (
                    <img
                      src={instance.worldThumbnailUrl}
                      alt=""
                      className="h-20 w-28 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-slate-700 text-slate-400">
                      <MapPin size={24} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{instance.worldName}</h3>
                    <p className="mt-1 truncate font-mono text-xs text-slate-400">
                      {instance.instanceId}
                    </p>
                    <p className="mt-3 flex items-center gap-1 text-sm text-blue-300">
                      <Users size={15} />
                      {instance.friends.length} friend{instance.friends.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-700/70 p-3">
                  {instance.friends.map((friend) => (
                    <div
                      key={friend.id}
                      title={friend.status}
                      className="flex max-w-full items-center gap-2 rounded-full bg-slate-700/70 py-1 pl-1 pr-3 text-sm"
                    >
                      {friend.iconUrl ? (
                        <img
                          src={friend.iconUrl}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-xs">
                          {friend.displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{friend.displayName}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
