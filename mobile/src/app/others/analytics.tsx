import { ButtonEx, TouchableEx } from "@/components/CustomElements";
import HistoryListView from "@/components/features/analytics/HistoryListView";
import HistoryTimeline from "@/components/features/analytics/HistoryTimeline";
import GenericScreen from "@/components/layout/GenericScreen";
import { navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useSetting } from "@/contexts/SettingContext";
import { getLogsFromDesktop } from "@/generated/desktopapi/client";
import { analyzeSessions, WorldSession } from "@/lib/funcs/analizeSessions";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View, Modal, Alert } from "react-native";

// 日付ヘルパー (Web版のgetLocalISODate相当)
const getLocalISODateStr = (d: Date) => {
  const offset = d.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
  return localISOTime;
};

export default function Analytics() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings } = useSetting();

  // 状態管理
  const [targetDate, setTargetDate] = useState<string>(getLocalISODateStr(new Date()));
  const [sessions, setSessions] = useState<WorldSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // データ取得
  const fetchLogs = useCallback(async () => {
    if (!settings.otherOptions_desktopAppURL) {
      // console.warn("Desktop app URL is not set.");
      return;
    }

    setLoading(true);
    try {
      const start = `${targetDate} 00:00:00`;
      const end = `${targetDate} 23:59:59`;

      const res = await getLogsFromDesktop(settings.otherOptions_desktopAppURL, {
        start: start,
        end: end,
      });

      if (res.status !== 200) {
        console.error("Failed to fetch logs from desktop app:", res.statusText);
      } else {
        const analyzedSessions = analyzeSessions(res.data, {
          start: new Date(start.replace(' ', 'T')).getTime(),
          end: new Date(end.replace(' ', 'T')).getTime(),
        });
        console.log(
          "Logs fetched from desktop app:",
          "\ncount:", analyzedSessions.length,
          "\nsessions:", analyzedSessions.map(s =>
            `\n\t${new Date(s.startTime).toLocaleTimeString().padStart(8, '0')}~${new Date(s.endTime).toLocaleTimeString().padStart(8, '0')} (${(s.durationMs / 60000).toString().slice(0, 3)} min): ${s.worldName}`
          ).join(", ")
        );
        setSessions(analyzedSessions);
      }
    } catch (error) {
      console.error("Failed to fetch logs from desktop app:", error);
    } finally {
      setLoading(false);
    }
  }, [settings.otherOptions_desktopAppURL, targetDate]);

  // 日付変更時の副作用
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 日付操作ハンドラ
  const handleDateChange = (offset: number) => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + offset);
    setTargetDate(getLocalISODateStr(d));
  };

  return (
    <GenericScreen>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* --- Header Control --- */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>History</Text>

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
              <ScrollView style={styles.scrollView}>
                <HistoryListView sessions={sessions} targetDate={targetDate} />
              </ScrollView>
            ) : (
              <HistoryTimeline sessions={sessions} targetDate={targetDate} />
            )
          )}
        </View>
      </View>
    </GenericScreen>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.small,
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
  scrollView: {
    flex: 1,
  },
});
