import { spacing } from "@/configs/styles";
import { PlayerInterval, WorldSession } from "@/lib/funcs/analizeSessions";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, Text, View, Modal, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useState } from "react";
import { TouchableEx, ButtonEx } from "@/components/CustomElements";
import { useSelfInvite } from "@/hooks/useSelfInvite";
import IconSymbol from "@/components/view/icon-components/IconView";

export default function HistoryListView({ sessions, targetDate }: { sessions: WorldSession[], targetDate: string }) {
  const theme = useTheme();

  // モーダル用のステート
  const [selectedSession, setSelectedSession] = useState<WorldSession | null>(null);

  return (
    <View style={styles.listViewContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        {sessions.map((session, idx) => (
          <SessionCard
            key={`${session.startTime}-${idx}`}
            session={session}
            theme={theme}
            onLongPressWorld={() => setSelectedSession(session)}
          />
        ))}
      </ScrollView>

      {/* インスタンス詳細・招待モーダル */}
      <SessionDetailModal
        session={selectedSession}
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        theme={theme}
      />
    </View>
  );
}

function SessionCard({ session, theme, onLongPressWorld }: { session: WorldSession, theme: any, onLongPressWorld: () => void }) {
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const durationMin = Math.floor(session.durationMs / 1000 / 60);

  // locationからインスタンスIDの数字・識別子部分を抽出 (例: "wrld_xxxx:12345~hidden..." -> "12345")
  const instanceIdPart = session.location && session.location.includes(":")
    ? session.location.split(":")[1].split("~")[0]
    : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <TouchableEx
            onLongPress={onLongPressWorld}
            delayLongPress={300} // 少し早めに長押し判定
            style={styles.worldNameContainer}
          >
            <Text style={[styles.cardWorldName, { color: theme.colors.primary }]} numberOfLines={2}>
              {session.worldName}
            </Text>
            <IconSymbol name="information-outline" size={14} color={theme.colors.primary} style={styles.infoIcon} />
          </TouchableEx>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMetaText}>{formatTime(session.startTime)} - {formatTime(session.endTime)}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{durationMin} min</Text>
            </View>
            {/* インスタンスIDのバッジを追加 */}
            {instanceIdPart && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>#{instanceIdPart}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.cardMetaText, { marginLeft: 8 }]}>{session.players.length} met</Text>
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

// ----------------------------------------------------------------------
// インスタンス詳細 ＆ 自分を招待用モーダルコンポーネント
// ----------------------------------------------------------------------
function SessionDetailModal({ session, visible, onClose, theme }: { session: WorldSession | null, visible: boolean, onClose: () => void, theme: any }) {
  const { inviteMyself, isInviting } = useSelfInvite();

  if (!session) return null;

  // location から worldId と instanceId を分離 (例: wrld_xxxx:12345~hidden...)
  const locationParts = session.location.split(":");
  const worldId = locationParts[0];
  const instanceId = locationParts.slice(1).join(":"); // 残りの部分を再結合
  const isValidLocation = worldId.startsWith("wrld_") && instanceId;

  const handleInvite = async () => {
    if (isValidLocation) {
      await inviteMyself(worldId, instanceId);
      // 招待完了後、自動で閉じるかはお好みで（今回は開いたままにして結果をToastで確認させる）
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Instance Details</Text>

          <View style={styles.modalInfoBox}>
            <Text style={[styles.modalLabel, { color: theme.colors.text, opacity: 0.7 }]}>World Name</Text>
            <Text style={[styles.modalValue, { color: theme.colors.text }]} selectable>{session.worldName}</Text>

            <Text style={[styles.modalLabel, { color: theme.colors.text, opacity: 0.7, marginTop: 12 }]}>Location ID</Text>
            <Text style={[styles.modalValue, { color: theme.colors.text, fontSize: 11 }]} selectable>
              {session.location || "Private / Offline"}
            </Text>
          </View>

          <View style={styles.modalActions}>
            <ButtonEx
              onPress={onClose}
              style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
            > Close </ButtonEx>
            {isValidLocation ? (
              <TouchableEx
                style={[styles.modalButton, styles.inviteButton]}
                onPress={handleInvite}
                disabled={isInviting}
              >
                {isInviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <IconSymbol name="email-fast" size={18} color="#fff" />
                    <Text style={styles.inviteButtonText}>Invite Myself</Text>
                  </>
                )}
              </TouchableEx>
            ) : (
              <View style={[styles.modalButton, styles.disabledButton]}>
                <Text style={styles.disabledButtonText}>Cannot Invite</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
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
  worldNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    opacity: 0.6,
  },
  cardWorldName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1, // アイコンと並べた時にテキストがはみ出さないように
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

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInfoBox: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButton: {
    backgroundColor: '#007AFF', // 青系のアクセントカラー
    flexDirection: 'row',
    gap: 6,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  disabledButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
