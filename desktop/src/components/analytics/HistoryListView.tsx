// ============================================================================
//  List View Components (Existing)

import { Clock, MapPin, User } from "lucide-react";
import { PlayerInterval, SessionPayload } from "../../generated/bindings";

// ============================================================================
export default function HistoryListView({ sessions, targetDate }: { sessions: SessionPayload[], targetDate: string }) {
  return (
    <div className="space-y-6 p-6">
      {sessions.map((session, idx) => (
        <SessionCard key={`${session.startTime}-${idx}`} session={session} />
      ))}
    </div>
  );
}
// --- 個別のワールド滞在カードコンポーネント ---
function SessionCard({ session }: { session: SessionPayload }) {
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const durationMin = Math.floor(session.durationMs / 1000 / 60);

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
              <Clock size={12} /> {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </span>
            <span className="bg-slate-700 px-1.5 rounded text-[10px]">
              {durationMin} min
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 hidden sm:block">
          {session.players.length} people met
        </div>
      </div>

      {/* タイムラインエリア */}
      <div className="p-4 relative">
        {/* 自分 (Self) のベースバー */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-bold text-blue-400"><User size={12} /> {session.username || "You"}</span>
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
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Met Players</div>
            {session.players.map((player) => (
              <PlayerTimelineRow
                key={player.name}
                player={player}
                sessionStart={Date.parse(session.startTime)}
                sessionDuration={session.durationMs}
              />
            ))}
          </div>
        )}

        {session.players.length === 0 && (
          <p className="text-xs text-slate-600 italic">No other players detected during this session.</p>
        )}
      </div>
    </div>
  );
}

function PlayerTimelineRow({ player, sessionStart, sessionDuration }: {
  player: PlayerInterval,
  sessionStart: number,
  sessionDuration: number,
}) {
  const pDurationMin = Math.floor(player.totalDurationMs / 1000 / 60);

  return (
    <div className="group">
      <div className="flex items-center justify-between text-xs text-slate-300 mb-0.5">
        <span className="font-medium truncate w-32">{player.name}</span>
        <span className="text-[10px] text-slate-500">{pDurationMin > 0 ? `${pDurationMin}m` : "<1m"}</span>
      </div>

      {/* タイムラインバーの背景 */}
      <div className="h-1.5 bg-slate-700/50 rounded-full w-full relative">
        {/* 滞在区間の描画 (複数回出入りに対応) */}
        {player.intervals.map((interval, i) => {
          // セッション開始からの経過時間(%)を計算
          const startPercent = Math.max(0, ((Date.parse(interval.start) - sessionStart) / sessionDuration) * 100);
          const endPercent = Math.min(100, ((Date.parse(interval.end) - sessionStart) / sessionDuration) * 100);
          const widthPercent = endPercent - startPercent;

          return (
            <div
              key={i}
              className="absolute top-0 h-full bg-green-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
              }}
              title={`${new Date(interval.start).toLocaleTimeString()} - ${new Date(interval.end).toLocaleTimeString()}`}
            />
          );
        })}
      </div>
    </div>
  );
}
