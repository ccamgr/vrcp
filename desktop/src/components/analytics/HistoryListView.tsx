// ============================================================================
//  List View Components (Existing)

import { Check, Clock, ExternalLink, MapPin, Send, User } from "lucide-react";
import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PlayerInterval, SessionPayload } from "../../generated/bindings";
import { commands } from "../../generated/bindings";
import { formatTime } from "../../lib/date";
import { confirmDirectLaunch } from "../../lib/native";

export default function HistoryListView({
  sessions,
  targetDate,
}: {
  sessions: SessionPayload[];
  targetDate: string;
}) {
  const [invitingSessionId, setInvitingSessionId] = useState<number | null>(
    null,
  );
  const [launchingSessionId, setLaunchingSessionId] = useState<number | null>(
    null,
  );
  const [confirmingLaunchSessionId, setConfirmingLaunchSessionId] = useState<
    number | null
  >(null);
  const [invitedSessionId, setInvitedSessionId] = useState<number | null>(null);
  const [launchedSessionId, setLaunchedSessionId] = useState<number | null>(null);
  const [inviteFailedSessionId, setInviteFailedSessionId] = useState<
    number | null
  >(null);
  const [launchFailedSessionId, setLaunchFailedSessionId] = useState<
    number | null
  >(null);

  const handleInvite = async (session: SessionPayload) => {
    const separatorIndex = session.instanceId.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex === session.instanceId.length - 1) {
      setInviteFailedSessionId(session.sourceId);
      return;
    }

    const worldId = session.instanceId.slice(0, separatorIndex);
    const instanceId = session.instanceId.slice(separatorIndex + 1);
    if (!worldId.startsWith("wrld_")) {
      setInviteFailedSessionId(session.sourceId);
      return;
    }

    setInvitingSessionId(session.sourceId);
    setInviteFailedSessionId(null);
    try {
      const result = await commands.inviteMyself(worldId, instanceId);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      setInvitedSessionId(session.sourceId);
    } catch (error) {
      console.error("Failed to send self-invite", error);
      setInviteFailedSessionId(session.sourceId);
    } finally {
      setInvitingSessionId(null);
    }
  };

  const handleDirectLaunch = async (session: SessionPayload) => {
    const separatorIndex = session.instanceId.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex === session.instanceId.length - 1) {
      setLaunchFailedSessionId(session.sourceId);
      return;
    }

    const worldId = session.instanceId.slice(0, separatorIndex);
    const instanceId = session.instanceId.slice(separatorIndex + 1);
    if (!worldId.startsWith("wrld_")) {
      setLaunchFailedSessionId(session.sourceId);
      return;
    }

    setConfirmingLaunchSessionId(session.sourceId);
    let confirmed = false;
    try {
      confirmed = await confirmDirectLaunch(session.worldName);
    } catch (error) {
      console.error("Failed to show direct launch confirmation", error);
      setLaunchFailedSessionId(session.sourceId);
      return;
    } finally {
      setConfirmingLaunchSessionId(null);
    }
    if (!confirmed) return;

    // Do not use URL here: VRChat does not decode encoded instance separators.
    const launchUrl = `vrchat://launch/?ref=vrcp&id=${worldId}:${instanceId}&attach=1`;
    setLaunchingSessionId(session.sourceId);
    setLaunchFailedSessionId(null);
    try {
      await openUrl(launchUrl);
      void commands
        .logDirectLaunchResult(worldId, instanceId, launchUrl, "dispatched", null)
        .catch((loggingError) =>
          console.error("Failed to write direct launch log", loggingError),
        );
      setLaunchedSessionId(session.sourceId);
    } catch (error) {
      console.error("Failed to launch VRChat", error);
      void commands
        .logDirectLaunchResult(worldId, instanceId, launchUrl, "failed", String(error))
        .catch((loggingError) =>
          console.error("Failed to write direct launch error log", loggingError),
        );
      setLaunchFailedSessionId(session.sourceId);
    } finally {
      setLaunchingSessionId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {sessions.map((session, idx) => (
        <SessionCard
          key={`${session.startTime}-${idx}`}
          session={session}
          onInvite={handleInvite}
          onDirectLaunch={handleDirectLaunch}
          isInviting={invitingSessionId === session.sourceId}
          isLaunching={launchingSessionId === session.sourceId}
          isConfirmingLaunch={confirmingLaunchSessionId === session.sourceId}
          isInvited={invitedSessionId === session.sourceId}
          isLaunched={launchedSessionId === session.sourceId}
          inviteFailed={inviteFailedSessionId === session.sourceId}
          launchFailed={launchFailedSessionId === session.sourceId}
        />
      ))}
    </div>
  );
}
// --- 個別のワールド滞在カードコンポーネント ---
function SessionCard({
  session,
  onInvite,
  onDirectLaunch,
  isInviting,
  isLaunching,
  isConfirmingLaunch,
  isInvited,
  isLaunched,
  inviteFailed,
  launchFailed,
}: {
  session: SessionPayload;
  onInvite: (session: SessionPayload) => void;
  onDirectLaunch: (session: SessionPayload) => void;
  isInviting: boolean;
  isLaunching: boolean;
  isConfirmingLaunch: boolean;
  isInvited: boolean;
  isLaunched: boolean;
  inviteFailed: boolean;
  launchFailed: boolean;
}) {
  const durationMin = Math.floor(session.durationMs / 1000 / 60);
  const canInvite = session.instanceId.startsWith("wrld_") && session.instanceId.includes(":");

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
      {/* セッションヘッダー */}
      <div className="bg-slate-700/50 px-4 py-3 flex justify-between items-center border-b border-slate-700">
        <div>
          <h3 className="font-bold text-lg text-blue-200 flex items-center gap-2">
            <MapPin size={18} /> {session.worldName}
          </h3>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {formatTime(session.startTime)} -{" "}
              {formatTime(session.endTime)}
            </span>
            <span className="bg-slate-700 px-1.5 rounded text-[10px]">
              {durationMin} min
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-500 hidden sm:block">
            {session.players.length} people met
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onInvite(session)}
              disabled={!canInvite || isInviting || isLaunching || isInvited}
              title={
                canInvite
                  ? "Send an invite to this instance"
                  : "This session has no joinable instance ID"
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/50 bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isInviting ? (
                "Sending..."
              ) : isInvited ? (
                <>
                  <Check size={14} /> Invite sent
                </>
              ) : (
                <>
                  <Send size={14} /> Invite Myself
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDirectLaunch(session)}
              disabled={
                !canInvite ||
                isInviting ||
                isLaunching ||
                isConfirmingLaunch ||
                isLaunched
              }
              title={
                canInvite
                  ? "Launch VRChat and join this instance directly"
                  : "This session has no joinable instance ID"
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isConfirmingLaunch || isLaunching ? (
                isConfirmingLaunch ? "Confirming..." : "Launching..."
              ) : isLaunched ? (
                <>
                  <Check size={14} /> Launch requested
                </>
              ) : (
                <>
                  <ExternalLink size={14} /> Join Directly
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {inviteFailed && (
        <p className="border-b border-slate-700 bg-red-950/40 px-4 py-2 text-xs text-red-300">
          Failed to send the invite. Confirm that you are logged in and the instance is still available.
        </p>
      )}
      {launchFailed && (
        <p className="border-b border-slate-700 bg-red-950/40 px-4 py-2 text-xs text-red-300">
          Failed to launch VRChat. Confirm that VRChat is installed and the instance is still available.
        </p>
      )}

      {/* タイムラインエリア */}
      <div className="p-4 relative">
        {/* 自分 (Self) のベースバー */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-bold text-blue-400">
              <User size={12} /> {session.username || "You"}
            </span>
            <span>{durationMin} min</span>
          </div>
          <div className="h-2 bg-blue-500/30 rounded-full w-full relative overflow-hidden">
            {/* 自分はずっといるので全幅 */}
            <div className="absolute top-0 left-0 h-full bg-blue-500 w-full opacity-50" />
          </div>
        </div>

        {/* 他のプレイヤーリスト */}
        {session.players.length > 0 && (
          <div className="space-y-2 mt-2 border-t border-slate-700/50 pt-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
              Met Players
            </div>
            {session.players.map((player) => (
              <PlayerTimelineRow
                key={player.name}
                player={player}
                sessionStart={session.startTime}
                sessionDuration={session.durationMs}
              />
            ))}
          </div>
        )}

        {session.players.length === 0 && (
          <p className="text-xs text-slate-600 italic">
            No other players detected during this session.
          </p>
        )}
      </div>
    </div>
  );
}

function PlayerTimelineRow({
  player,
  sessionStart,
  sessionDuration,
}: {
  player: PlayerInterval;
  sessionStart: number;
  sessionDuration: number;
}) {
  const pDurationMin = Math.floor(player.totalDurationMs / 1000 / 60);

  return (
    <div className="group">
      <div className="flex items-center justify-between text-xs text-slate-300 mb-0.5">
        <span className="font-medium truncate w-32">{player.name}</span>
        <span className="text-[10px] text-slate-500">
          {pDurationMin > 0 ? `${pDurationMin}m` : "<1m"}
        </span>
      </div>

      {/* タイムラインバーの背景 */}
      <div className="h-1.5 bg-slate-700/50 rounded-full w-full relative">
        {/* 滞在区間の描画 (複数回出入りに対応) */}
        {player.intervals.map((interval, i) => {
          // セッション開始からの経過時間(%)を計算
          const startPercent = Math.max(
            0,
            ((interval.start - sessionStart) / sessionDuration) * 100,
          );
          const endPercent = Math.min(
            100,
            ((interval.end - sessionStart) / sessionDuration) * 100,
          );
          const widthPercent = endPercent - startPercent;

          return (
            <div
              key={i}
              className="absolute top-0 h-full bg-green-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${formatTime(interval.start)} - ${formatTime(interval.end)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
