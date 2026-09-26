import { useEffect, useMemo, useState } from "react";
import { commands, SessionPayload } from "../generated/bindings";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutList,
} from "lucide-react";
import HistoryListView from "../components/analytics/HistoryListView";
import HistoryTimeline from "../components/analytics/HistoryTimeline";
import { formatDate } from "../lib/date";

export default function Analytics() {
  const [targetDate, setTargetDate] = useState<string>(
    formatDate(new Date().getTime()),
  );
  const [sessions, setSessions] = useState<SessionPayload[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [listOrder, setListOrder] = useState<"asc" | "desc">("desc");

  const listSessions = useMemo(
    () =>
      [...sessions].sort((left, right) =>
        listOrder === "desc"
          ? right.startTime - left.startTime
          : left.startTime - right.startTime,
      ),
    [listOrder, sessions],
  );

  useEffect(() => {
    let cancelled = false;
    fetchLogsByDate(targetDate, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [targetDate]);

  const fetchLogsByDate = async (dateStr: string, isCancelled: () => boolean) => {
    setLoading(true);
    try {
      // Parse date-only values in the local time zone.
      const [year, month, day] = dateStr.split("-").map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0).getTime();
      const endOfDay = new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999,
      ).getTime();

      const result = await commands.getSessions(startOfDay, endOfDay);

      if (result.status === "ok") {
        if (!isCancelled()) setSessions(result.data);
      } else {
        console.error(result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  };

  const handleDateChange = (offset: number) => {
    // Fix timezone issue when parsing "YYYY-MM-DD" directly
    const [year, month, day] = targetDate.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + offset);
    setTargetDate(
      d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0"),
    );
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex justify-between items-center p-6">
        <h2 className="text-2xl font-bold">History</h2>
        <div className="flex items-center gap-4">
          {/* 表示モード切り替えスイッチ */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 w-24 justify-center rounded flex items-center gap-2 text-sm transition ${viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <LayoutList size={16} />{" "}
              <span className="hidden md:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`p-1 w-24 justify-center rounded flex items-center gap-2 text-sm transition ${viewMode === "timeline" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <BarChart3 size={16} />{" "}
              <span className="hidden md:inline">Timeline</span>
            </button>
          </div>

          {viewMode === "list" && (
            <button
              type="button"
              onClick={() =>
                setListOrder((current) =>
                  current === "desc" ? "asc" : "desc",
                )
              }
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition hover:text-white"
              title="Sort sessions by start time"
            >
              {listOrder === "desc" ? (
                <ArrowDown size={16} />
              ) : (
                <ArrowUp size={16} />
              )}
              {listOrder === "desc" ? "Newest" : "Oldest"}
            </button>
          )}

          {/* 日付操作 */}
          <div className="flex gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-1 hover:bg-slate-700 rounded transition"
            >
              <ChevronLeft size={20} />
            </button>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-center focus:outline-none font-mono text-sm w-32 text-white [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <button
              onClick={() => handleDateChange(1)}
              className="p-1 hover:bg-slate-700 rounded transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            Loading logs...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-lg">No activity recorded on this day.</p>
            <p className="text-sm opacity-60">
              Try selecting a different date.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {viewMode === "list" ? (
              <HistoryListView
                sessions={listSessions}
                targetDate={targetDate}
              />
            ) : (
              <HistoryTimeline sessions={sessions} targetDate={targetDate} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
