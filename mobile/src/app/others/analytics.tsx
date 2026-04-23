import { TouchableEx } from "@/components/CustomElements";
import HistoryListView from "@/components/features/analytics/HistoryListView";
import HistoryTimeline from "@/components/features/analytics/HistoryTimeline";
import GenericScreen from "@/components/layout/GenericScreen";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useSetting } from "@/contexts/SettingContext";
import { useLogManager } from "@/hooks/useLogManager";
import { formatDate } from "@/lib/date";
import { analyzeSessions, WorldSession } from "@/lib/funcs/analizeSessions";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

const SYNC_INTERVAL = 10 * 1000; // 5分

export default function Analytics() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings } = useSetting();

  // 状態管理
  const [targetDate, setTargetDate] = useState<string>(formatDate(new Date().getTime())); // YYYY-MM-DD形式
  const [sessions, setSessions] = useState<WorldSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // hookから isSyncing も取り出します
  const { getLocalLogs, getLastSync, syncLogs, isSyncing } = useLogManager();

  // データ取得 (UIブロックを避けるため loading は初回のみ)
  const fetchLogs = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const [year, month, day] = targetDate.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0).getTime();
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

      const localLogs = await getLocalLogs(startOfDay, endOfDay);
      const analyzedSessions = analyzeSessions(localLogs, {
        start: startOfDay,
        end: endOfDay
      });

      setSessions(analyzedSessions);
    } catch (error) {
      console.error("Failed to analyze local logs:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [targetDate, getLocalLogs]);

  // 日付が変更された時、または初回マウント時にローカルDBから読み込む
  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // 画面が表示されている間だけ有効になる同期ロジック
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let intervalId: number;

      const checkAndSync = async () => {
        // 表示対象が「今日」かどうか判定
        const todayStr = formatDate(new Date().getTime());
        if (targetDate === todayStr) {
          const lastSyncTime = await getLastSync();
          const now = Date.now();
          if (!lastSyncTime || now - lastSyncTime > SYNC_INTERVAL) {
            await syncLogs(false);
            if (isMounted) await fetchLogs(true);
          }
        }
      };

      // 1. 画面にフォーカスが当たった瞬間にチェック
      checkAndSync();

      // 2. 画面を開いている間、5分ごとに定期チェック
      intervalId = setInterval(() => {
        checkAndSync();
      }, SYNC_INTERVAL);

      // クリーンアップ (画面から離れたらタイマーを解除)
      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }, [targetDate, fetchLogs, getLastSync, syncLogs])
  );

  // 日付操作ハンドラ
  const handleDateChange = (offset: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + offset);
    setTargetDate(formatDate(d.getTime()));
  };

  return (
    <GenericScreen>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* --- Header Control --- */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>History</Text>
          </View>

          <View style={styles.controlsRow}>
            {/* Mode Switcher */}
            <View style={styles.modeSwitch}>
              <TouchableEx
                style={[styles.modeBtn, viewMode === 'list' && styles.modeBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.modeBtnText, viewMode === 'list' && styles.modeBtnTextActive]}>List</Text>
              </TouchableEx>
              <TouchableEx
                style={[styles.modeBtn, viewMode === 'timeline' && styles.modeBtnActive]}
                onPress={() => setViewMode('timeline')}
              >
                <Text style={[styles.modeBtnText, viewMode === 'timeline' && styles.modeBtnTextActive]}>Timeline</Text>
              </TouchableEx>
            </View>

            {/* Date Controls */}
            <View style={styles.dateControl}>
              <TouchableEx onPress={() => handleDateChange(-1)} style={styles.dateBtn}>
                <Text style={styles.dateBtnText}>{"<"}</Text>
              </TouchableEx>
              <Text style={[styles.dateText, { color: theme.colors.text }]}>{targetDate}</Text>
              <TouchableEx onPress={() => handleDateChange(1)} style={styles.dateBtn}>
                <Text style={styles.dateBtnText}>{">"}</Text>
              </TouchableEx>
            </View>
          </View>
        </View>

        {/* --- Main Content --- */}
        <View style={styles.contentArea}>
          {loading ? (
            <View style={styles.centerContainer}>
              <Text style={{ color: theme.colors.text }}>Loading logs...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.noDataText, { color: theme.colors.text }]}>No activity recorded on this day.</Text>
            </View>
          ) : (
            viewMode === 'list' ? (
              <HistoryListView sessions={sessions} targetDate={targetDate} />
            ) : (
              // タイムラインモード
              <HistoryTimeline sessions={sessions} targetDate={targetDate} />
            )
          )}
        </View>
      </View>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.small,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#3b82f6', // blue-500
  },
  modeBtnText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modeBtnTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  dateControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 2,
  },
  dateBtn: {
    padding: 6,
  },
  dateBtnText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    paddingHorizontal: 8,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  contentArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
