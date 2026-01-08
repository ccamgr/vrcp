import { TouchableEx } from "@/components/CustomElements";
import IconButton from "@/components/view/icon-components/IconButton";
import { radius, spacing } from "@/configs/styles";
import { WorldSession } from "@/lib/funcs/analizeSessions";
import { useTheme } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HistoryTimeline({ sessions, targetDate }: { sessions: WorldSession[], targetDate: string }) {
  const theme = useTheme();
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
  const HOUR_HEIGHT = 120;
  const DAY_HEIGHT = 24 * HOUR_HEIGHT;
  const MIN_VISIBLE_DURATION_MS = 1 * 60 * 1000; // これ以下の滞在は表示しない (1分未満)
  const MIN_SESSION_HEIGHT_MS = 1 * 60 * 1000; // 表示される場合に最小でもこの時間分の高さを表示する

  return (
    <View style={styles.timelineContainer}>
      <ScrollView contentContainerStyle={{ height: DAY_HEIGHT + 50, paddingBottom: 50 }}>
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
                      {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <Text style={{ color: theme.colors.text, fontSize: 12 }}>
            {new Date(selectedSession.startTime).toLocaleTimeString()} - {new Date(selectedSession.endTime).toLocaleTimeString()} ({Math.floor(selectedSession.durationMs / 60000)} min)
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 12, marginTop: 4 }}>
            Met Players: {selectedSession.players.length}
          </Text>
          <ScrollView style={styles.detailPlayerList}>
            {selectedSession.players.map((p, i) => (
              <Text key={i} style={{ color: theme.colors.text, fontSize: 11 }}>・{p.name}</Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
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
