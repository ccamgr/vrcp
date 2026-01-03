import { useEffect, useState, useMemo } from "react";
import { commands } from "../generated/bindings";
import { analyzeSessions, type WorldSession } from "../lib/logAnalytics";
import { Calendar, ChevronLeft, ChevronRight, LayoutList, BarChart3, Clock, MapPin, User, Hash, Users, Globe } from "lucide-react";
import { getLocalISODate } from "../lib/date";

export default function History() {
  const [targetDate, setTargetDate] = useState<string>(getLocalISODate(new Date()).split('T')[0]); // YYYY-MM-DD形式
  const [sessions, setSessions] = useState<WorldSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 表示モードの状態管理 (list | timeline)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // 日付変更時にデータ取得
  useEffect(() => {
    fetchLogsByDate(targetDate);
  }, [targetDate]);

  const fetchLogsByDate = async (dateStr: string) => {
    setLoading(true);
    try {
      // 指定日の 00:00:00 から 23:59:59 までを取得
      const start = `${dateStr} 00:00:00`;
      const end = `${dateStr} 23:59:59`;

      const result = await commands.getLogs(start, end);

      if (result.status === "ok") {
        const parsedSessions = analyzeSessions(result.data);
        setSessions(parsedSessions);
      } else {
        console.error(result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (offset: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + offset);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center p-6">
        <h2 className="text-2xl font-bold">History</h2>
        <div className="flex items-center gap-4">
          {/* 表示モード切り替えスイッチ */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 w-24 justify-center rounded flex items-center gap-2 text-sm transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutList size={16} /> <span className="hidden md:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1 w-24 justify-center rounded flex items-center gap-2 text-sm transition ${viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <BarChart3 size={16} /> <span className="hidden md:inline">Timeline</span>
            </button>
          </div>

          {/* 日付操作 */}
          <div className="flex gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button onClick={() => handleDateChange(-1)} className="p-1 hover:bg-slate-700 rounded transition">
              <ChevronLeft size={20} />
            </button>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-center focus:outline-none font-mono text-sm w-32 text-white [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <button onClick={() => handleDateChange(1)} className="p-1 hover:bg-slate-700 rounded transition">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* --- メインコンテンツ --- */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            Loading logs...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-lg">No activity recorded on this day.</p>
            <p className="text-sm opacity-60">Try selecting a different date.</p>
          </div>
        ) : (
          // モードによって表示を切り替え
          <div className="h-full overflow-y-auto">
            {viewMode === 'list' ? (
              <ListView sessions={sessions} />
            ) : (
              <DayTimelineView sessions={sessions} targetDate={targetDate} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
//  Timeline View Component (New!)
// ============================================================================import { useMemo, useState, useRef } from "react";

// 型定義は既存のものを使用

function DayTimelineView({ sessions, targetDate }: { sessions: WorldSession[], targetDate: string }) {
  // ツールチップ用の状態
  const [hoveredSession, setHoveredSession] = useState<WorldSession | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. 時間軸の計算 (Min - Max)
  const { timelineStart, timelineEnd, totalDuration } = useMemo(() => {
    if (sessions.length === 0) {
      const start = new Date(`${targetDate}T00:00:00`).getTime();
      return { timelineStart: start, timelineEnd: start + 24 * 60 * 60 * 1000, totalDuration: 24 * 60 * 60 * 1000 };
    }
    let min = sessions[0].startTime;
    let max = sessions[0].endTime;
    sessions.forEach(s => {
      if (s.startTime < min) min = s.startTime;
      if (s.endTime > max) max = s.endTime;
    });
    // 前後15分の余白
    const padding = 15 * 60 * 1000;
    const start = min - padding;
    const end = max + padding;
    return { timelineStart: start, timelineEnd: end, totalDuration: end - start };
  }, [sessions, targetDate]);

  // 2. インスタンスごとのグループ化 (Y軸の決定)
  const instanceRows = useMemo(() => {
    const rows: { instanceId: string, worldName: string, sessions: WorldSession[] }[] = [];
    const map = new Map<string, number>(); // instanceId -> index

    sessions.forEach(session => {
      // instanceId が無い場合はワールド名などで代用キーを作る
      const key = session.instanceId || `${session.worldName}-unknown`;

      if (!map.has(key)) {
        map.set(key, rows.length);
        rows.push({
          instanceId: session.instanceId,
          worldName: session.worldName,
          sessions: []
        });
      }
      rows[map.get(key)!].sessions.push(session);
    });
    return rows;
  }, [sessions]);

  // 時間軸のメモリ (30分刻み)
  const timeMarkers = useMemo(() => {
    const markers = [];
    const step = 30 * 60 * 1000;
    // 開始直後の xx:00 or xx:30 を探す
    let current = Math.ceil(timelineStart / step) * step;
    while (current < timelineEnd) {
      markers.push(current);
      current += step;
    }
    return markers;
  }, [timelineStart, timelineEnd]);

  // マウス移動ハンドラ
  const handleMouseMove = (e: React.MouseEvent) => {
    // ツールチップをマウスの少し右下に表示
    setMousePos({ x: e.clientX + 15, y: e.clientY + 15 });
  };

  const ROW_HEIGHT = 50; // 1行の高さ
  const HEADER_HEIGHT = 40;

  return (
    <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative p-6">
      <div className="flex-1 overflow-auto relative border border-slate-700/50 rounded-xl bg-slate-800/30" onMouseMove={handleMouseMove}>

        <div className="min-w-[800px] relative">
          {/* --- ヘッダー (時間軸ラベル) --- */}
          <div className="sticky top-0 z-20 bg-slate-900/90 border-b border-slate-700 h-10 w-full flex items-end pb-1 backdrop-blur-sm">
            <div className="z-50 sticky left-0 backdrop-blur-sm w-40 flex-shrink-0 px-4 text-xs text-slate-500 font-bold border-r border-slate-700 h-full flex items-center">
              Instance Name
            </div>
            <div className="z-40 flex-1 relative h-full">
              {timeMarkers.map(time => {
                const left = ((time - timelineStart) / totalDuration) * 100;
                return (
                  <div key={time} className="absolute bottom-0 transform -translate-x-1/2 flex flex-col items-center" style={{ left: `${left}%` }}>
                    <span className="text-[10px] text-slate-400 font-mono mb-1">
                      {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="h-1.5 w-px bg-slate-600"></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- ボディ (グリッド & バー) --- */}
          <div className="relative">
            {/* 背景グリッド線 */}
            <div className="absolute inset-0 left-48 z-0 pointer-events-none">
              {timeMarkers.map(time => {
                const left = ((time - timelineStart) / totalDuration) * 100;
                return (
                  <div key={time} className="absolute top-0 bottom-0 border-l border-slate-700/30 border-dashed" style={{ left: `${left}%` }} />
                );
              })}
            </div>

            {/* 行の描画 */}
            {instanceRows.map((row, rowIndex) => (
              <div key={row.instanceId || rowIndex} className="flex border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors h-[50px]">

                {/* 左サイドバー: ワールド名 */}
                <div className="z-30 sticky left-0 backdrop-blur-sm w-40 flex-shrink-0 p-2 border-r border-slate-700 bg-slate-800/80 flex flex-col justify-center">
                  <div className="text-xs font-bold text-slate-300 truncate" title={row.worldName}>
                    {row.worldName}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono">
                    #{row.instanceId ? row.instanceId.split('~')[0] : '???'}
                    {/* InstanceIDが長すぎる場合があるので適当に省略表示 */}
                  </div>
                </div>

                {/* 右側: タイムラインバーエリア */}
                <div className="flex-1 relative h-full">
                  {row.sessions.map((session, sIdx) => {
                    const left = ((session.startTime - timelineStart) / totalDuration) * 100;
                    const width = ((session.durationMs) / totalDuration) * 100;
                    const displayWidth = Math.max(width, 0.2); // 最低幅

                    return (
                      <div
                        key={sIdx}
                        className="absolute top-1/2 -translate-y-1/2 h-8 rounded bg-blue-600 border border-blue-400/50 hover:bg-blue-400 cursor-pointer z-10 shadow-sm"
                        style={{
                          left: `${left}%`,
                          width: `${displayWidth}%`,
                        }}
                        onMouseEnter={() => setHoveredSession(session)}
                        onMouseLeave={() => setHoveredSession(null)}
                      >
                        {/* バーが細すぎる場合は文字を出さない */}
                        {displayWidth > 3 && (
                          <div className="w-full h-full flex items-center px-2 overflow-hidden">
                            <span className="text-[10px] text-white/90 truncate font-medium">
                              {Math.floor(session.durationMs / 60000)}m
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- フローティングツールチップ (Portal的に最前面に表示) --- */}
      {hoveredSession && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-3 w-72 text-left"
          style={{
            top: Math.min(mousePos.y, window.innerHeight - 300), // 画面下にはみ出さないよう調整
            left: Math.min(mousePos.x, window.innerWidth - 300)
          }}
        >
          <div className="border-b border-slate-700 pb-2 mb-2">
            <h4 className="font-bold text-blue-300 text-sm flex items-center gap-2">
              <Globe size={14} /> {hoveredSession.worldName}
            </h4>
            <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 font-mono">
              <div className="flex items-center gap-1">
                <Hash size={10} /> {hoveredSession.instanceId}
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <Clock size={10} />
                {new Date(hoveredSession.startTime).toLocaleTimeString()} - {new Date(hoveredSession.endTime).toLocaleTimeString()}
                <span className="bg-slate-800 px-1 rounded ml-1">
                  {Math.floor(hoveredSession.durationMs / 1000 / 60)} min
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users size={12} /> Met Players ({hoveredSession.players.length})
            </div>
            {hoveredSession.players.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No one met.</p>
            ) : (
              <div className="space-y-1">
                {hoveredSession.players.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex justify-between text-xs text-slate-300">
                    <span className="truncate w-32">{p.name}</span>
                    <span className="text-slate-500 text-[10px]">
                      {Math.floor(p.totalDurationMs / 60000)}m
                    </span>
                  </div>
                ))}
                {hoveredSession.players.length > 8 && (
                  <div className="text-[10px] text-slate-500 text-center pt-1">
                    ... and {hoveredSession.players.length - 8} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 統計フッター */}
      <div className="h-12 bg-slate-800 border-t border-slate-700 flex items-center px-4 gap-6 text-xs text-slate-400 shrink-0">
        <div>
          <span className="font-bold text-slate-200">{sessions.length}</span> Sessions
        </div>
        <div>
          <span className="font-bold text-slate-200">{instanceRows.length}</span> Unique Instances
        </div>
        <div>
          Total Play: <span className="font-bold text-blue-300">{Math.floor(sessions.reduce((a, c) => a + c.durationMs, 0) / 3600000 * 10) / 10}h</span>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
//  List View Components (Existing)
// ============================================================================
function ListView({ sessions }: { sessions: WorldSession[] }) {
  return (
    <div className="space-y-6 p-6">
      {sessions.map((session, idx) => (
        <SessionCard key={`${session.startTime}-${idx}`} session={session} />
      ))}
    </div>
  );
}
// --- 個別のワールド滞在カードコンポーネント ---
function SessionCard({ session }: { session: WorldSession }) {
  // ... (既存のコードと同じため省略していますが、実装時は元のSessionCardを使ってください)
  // 変更なし
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                sessionStart={session.startTime}
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
  player: any, // 型は logAnalytics からインポートしてください
  sessionStart: number,
  sessionDuration: number
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
        {player.intervals.map((interval: any, i: number) => {
          // セッション開始からの経過時間(%)を計算
          const startPercent = Math.max(0, ((interval.start - sessionStart) / sessionDuration) * 100);
          const endPercent = Math.min(100, ((interval.end - sessionStart) / sessionDuration) * 100);
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
