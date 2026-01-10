import { useEffect, useState, useMemo } from "react";
import { commands } from "../generated/bindings";
import { analyzeSessions, type WorldSession } from "../lib/analyzeSessions";
import { ChevronLeft, ChevronRight, LayoutList, BarChart3 } from "lucide-react";
import { getLocalISODate } from "../lib/date";
import HistoryListView from "../components/analytics/HistoryListView";
import HistoryTimeline from "../components/analytics/HistoryTimeline";

export default function Analytics() {
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
        const parsedSessions = analyzeSessions(result.data, {
          start: new Date(start.replace(' ', 'T')).getTime(),
          end: new Date(end.replace(' ', 'T')).getTime(),
        });
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
              <HistoryListView sessions={sessions} targetDate={targetDate} />
            ) : (
              <HistoryTimeline sessions={sessions} targetDate={targetDate} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}



