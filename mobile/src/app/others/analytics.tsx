import { ButtonEx, TouchableEx } from "@/components/CustomElements";
import GenericScreen from "@/components/layout/GenericScreen";
import IconButton from "@/components/view/icon-components/IconButton";
import { navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useSetting } from "@/contexts/SettingContext";
import { getLogsFromDesktop } from "@/generated/desktopapi/client";
import { analyzeSessions, WorldSession, PlayerInterval } from "@/lib/funcs/analizeSessions";
import { useTheme } from "@react-navigation/native";
import { numeric } from "drizzle-orm/pg-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, ScrollView, StyleSheet, Text, View, Modal, Alert } from "react-native";

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
        const analyzedSessions = analyzeSessions(res.data);
        console.log(
          "Logs fetched from desktop app:",
          "\ncount:", analyzedSessions.length,
          "\nsessions:", analyzedSessions.map(s =>
            `\n\t${new Date(s.startTime).toLocaleTimeString().padStart(8, '0')}~${new Date(s.endTime).toLocaleTimeString().padStart(8, '0')} (${(s.durationMs/60000).toString().slice(0, 3)} min): ${s.worldName}`
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
                <ListView sessions={sessions} theme={theme} />
              </ScrollView>
            ) : (
              <DayTimelineView sessions={sessions} targetDate={targetDate} theme={theme} />
            )
          )}
        </View>
      </View>
    </GenericScreen>
  );
};

// ============================================================================
//  Vertical Timeline View Component (スマホ最適化版)
// ============================================================================
function DayTimelineView({ sessions, targetDate, theme }: { sessions: WorldSession[], targetDate: string, theme: any }) {
  const [selectedSession, setSelectedSession] = useState<WorldSession | null>(null);

  // 1日の開始・終了時間を固定 (00:00 - 24:00)
  const { dayStart, totalDuration } = useMemo(() => {
    const start = new Date(`${targetDate}T00:00:00`).getTime();
    return {
      dayStart: start,
      totalDuration: 24 * 60 * 60 * 1000
    };
  }, [targetDate]);

  // 時間マーカー (1時間刻み)
  const timeMarkers = useMemo(() => {
    const markers = [];
    const step = 60 * 60 * 1000; // 1時間
    for (let i = 0; i <= 24; i++) {
      markers.push({
        time: dayStart + i * step,
        label: `${i.toString().padStart(2, '0')}:00`
      });
    }
    return markers;
  }, [dayStart]);

  // 画面全体の高さ設定 (24時間をどれくらいの高さで表示するか)
  // 1時間 = 120px 程度確保すると見やすい
  const HOUR_HEIGHT = 120;
  const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;
  const MIN_VISIBLE_DURATION_MS = 1 * 60 * 1000; // これ以下の滞在は表示しない (1分未満)
  const MIN_SESSION_HEIGHT_MS = 1 * 60 * 1000; // 表示される場合に最小でもこの時間分の高さを表示する

  return (
    <View style={styles.timelineContainer}>
      <ScrollView contentContainerStyle={{ height: TOTAL_HEIGHT + 50, paddingBottom: 50 }}>
        <View style={styles.timelineInnerVertical}>

          {/* 背景グリッド線 & 時間ラベル */}
          {timeMarkers.map((marker, index) => {
            // top位置の計算 (%)
            const topPercent = ((marker.time - dayStart) / totalDuration) * 100;

            return (
              <View key={index} style={[styles.gridLineContainer, { top: `${topPercent}%` }]}>
                <Text style={styles.timeLabelVertical}>
                  {marker.label}
                </Text>
                <View style={styles.gridLineVertical} />
              </View>
            );
          })}

          {/* セッションバーの描画 */}
          <View style={styles.sessionLayer}>
            {sessions.map((session, index) => {
              if (session.durationMs < MIN_VISIBLE_DURATION_MS) {
                return null; // 短すぎる滞在は表示しない
              }
              // 位置計算
              // 日付を跨ぐ場合の考慮（簡易的）: startがdayStartより前なら0にする等のガードが必要ですが、
              // 今回は単一日表示前提で計算します。
              const startRelative = Math.max(0, session.startTime - dayStart);
              const topPercent = (startRelative / totalDuration) * 100;
              const heightPercent = (session.durationMs / totalDuration) * 100;

              // 最小高さを確保 (短すぎる滞在も見逃さないように)
              const minHeightPercent = (MIN_SESSION_HEIGHT_MS / totalDuration) * 100; // 最低1分相当

              return (
                <TouchableEx
                  key={`${session.instanceId}-${index}`}
                  style={[
                    styles.sessionBlockVertical,
                    {
                      top: `${topPercent}%`,
                      height: `${Math.max(heightPercent, minHeightPercent)}%`,
                      backgroundColor: theme.colors.primary || '#2563eb',
                      borderColor: theme.colors.card,
                    }
                  ]}
                  onPress={() => setSelectedSession(session)}
                >
                  <Text style={styles.sessionTextTitle} numberOfLines={1}>
                    {session.worldName}
                  </Text>
                  {/* 高さが十分ある場合のみ時間を表示 */}
                  {heightPercent > 2 && (
                    <Text style={styles.sessionTextTime} numberOfLines={1}>
                      {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} -
                      {new Date(session.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  )}
                </TouchableEx>
              );
            })}
          </View>

        </View>
      </ScrollView>

      {/* 詳細モーダル (変更なし) */}
      {selectedSession && (
        <View style={[styles.detailOverlay, { backgroundColor: theme.colors.card }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {selectedSession.worldName}
            </Text>
            <IconButton name="close" size={24} color={theme.colors.text} onPress={() => setSelectedSession(null)} />
          </View>
          <Text style={{color: theme.colors.text, fontSize: 12}}>
            {new Date(selectedSession.startTime).toLocaleTimeString()} - {new Date(selectedSession.endTime).toLocaleTimeString()} ({Math.floor(selectedSession.durationMs / 60000)} min)
          </Text>
          <Text style={{color: theme.colors.text, fontSize: 12, marginTop: 4}}>
            Met Players: {selectedSession.players.length}
          </Text>
          <ScrollView style={styles.detailPlayerList}>
            {selectedSession.players.map((p, i) => (
               <Text key={i} style={{color: theme.colors.text, fontSize: 11}}>・{p.name}</Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================================================
//  List View Component
// ============================================================================
function ListView({ sessions, theme }: { sessions: WorldSession[], theme: any }) {
  return (
    <View style={styles.listViewContainer}>
      {sessions.map((session, idx) => (
        <SessionCard key={`${session.startTime}-${idx}`} session={session} theme={theme} />
      ))}
    </View>
  );
}

function SessionCard({ session, theme }: { session: WorldSession, theme: any }) {
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const durationMin = Math.floor(session.durationMs / 1000 / 60);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardWorldName, { color: theme.colors.primary }]}>{session.worldName}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMetaText}>{formatTime(session.startTime)} - {formatTime(session.endTime)}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{durationMin} min</Text>
            </View>
          </View>
        </View>
        <Text style={styles.cardMetaText}>{session.players.length} met</Text>
      </View>

      {/* Timeline Area */}
      <View style={styles.cardBody}>
        {/* Self Bar */}
        <View style={styles.playerRow}>
          <View style={styles.playerInfoRow}>
            <Text style={[styles.playerName, { color: theme.colors.primary }]}>{session.username || "You"}</Text>
            <Text style={styles.playerDuration}>{durationMin} min</Text>
          </View>
          <View style={styles.timelineTrack}>
             <View style={[styles.timelineFill, { width: '100%', backgroundColor: theme.colors.primary, opacity: 0.5 }]} />
          </View>
        </View>

        {/* Other Players */}
        {session.players.length > 0 ? (
          <View style={styles.othersContainer}>
            <Text style={styles.othersLabel}>Met Players</Text>
            {session.players.map((player) => (
              <PlayerTimelineRow
                key={player.name}
                player={player}
                sessionStart={session.startTime}
                sessionDuration={session.durationMs}
                theme={theme}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No other players detected.</Text>
        )}
      </View>
    </View>
  );
}

function PlayerTimelineRow({ player, sessionStart, sessionDuration, theme }: {
  player: PlayerInterval,
  sessionStart: number,
  sessionDuration: number,
  theme: any
}) {
  const pDurationMin = Math.floor(player.totalDurationMs / 1000 / 60);

  return (
    <View style={styles.playerRow}>
      <View style={styles.playerInfoRow}>
        <Text style={[styles.playerName, { color: theme.colors.text }]} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.playerDuration}>{pDurationMin > 0 ? `${pDurationMin}m` : "<1m"}</Text>
      </View>

      <View style={styles.timelineTrack}>
        {player.intervals.map((interval: any, i: number) => {
          const startPercent = Math.max(0, ((interval.start - sessionStart) / sessionDuration) * 100);
          const endPercent = Math.min(100, ((interval.end - sessionStart) / sessionDuration) * 100);
          const widthPercent = endPercent - startPercent;

          return (
            <View
              key={i}
              style={[
                styles.timelineFill,
                {
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: '#22c55e', // green-500
                  opacity: 0.7,
                  position: 'absolute'
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
//  Styles
// ============================================================================
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

  // List View Styles
  listViewContainer: {
    padding: spacing.medium,
    gap: spacing.medium,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.medium,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing.medium,
    backgroundColor: 'rgba(128,128,128,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  cardWorldName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  cardBody: {
    padding: spacing.medium,
  },
  playerRow: {
    marginBottom: 8,
  },
  playerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  playerName: {
    fontSize: 12,
    maxWidth: '70%',
  },
  playerDuration: {
    fontSize: 10,
    color: '#64748b',
  },
  timelineTrack: {
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 3,
  },
  othersContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  othersLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
// --- Vertical Timeline View Styles ---
  timelineContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  timelineInnerVertical: {
    flex: 1,
    height: '100%',
    position: 'relative',
    marginTop: 10,
    marginHorizontal: 10,
  },
  gridLineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 20, // ラベルの高さ分確保して、topの位置を中心に合わせる調整が必要ならここ
    transform: [{ translateY: -10 }], // 線を時間の中心に合わせる
    zIndex: 1,
  },
  timeLabelVertical: {
    width: 45,
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    paddingRight: 8,
    fontVariant: ['tabular-nums'],
  },
  gridLineVertical: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
  },

  sessionLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 50, // timeLabelの幅分空ける
    right: 0,
    zIndex: 2,
  },
  sessionBlockVertical: {
    position: 'absolute',
    left: 0,
    right: 0, // 幅いっぱい
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    justifyContent: 'center',
    opacity: 0.9,
    overflow: 'hidden',
  },
  sessionTextTitle: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  sessionTextTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },

  // Detail Overlay
  detailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.large,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: radius.large,
    elevation: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  detailPlayerList: {
    maxHeight: Dimensions.get('window').height * 0.3,
    marginTop: 8,
  },
});
