import { useMemo, useState } from "react";
import { WorldSession } from "../../lib/logAnalytics";
import { Clock, Globe, Hash, Users } from "lucide-react";

// ============================================================================
export default function HistoryTimeline({ sessions, targetDate }: { sessions: WorldSession[], targetDate: string }) {
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
