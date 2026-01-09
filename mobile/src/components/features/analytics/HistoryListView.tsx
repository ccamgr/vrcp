import { spacing } from "@/configs/styles";
import { PlayerInterval, WorldSession } from "@/lib/funcs/analizeSessions";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";

export default function HistoryListView({ sessions, targetDate }: { sessions: WorldSession[], targetDate: string }) {
  const theme = useTheme();

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
});
