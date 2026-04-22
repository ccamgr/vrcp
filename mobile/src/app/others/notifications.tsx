import GenericScreen from "@/components/layout/GenericScreen";
import { spacing } from "@/configs/styles";
import { Notification } from "@/generated/vrcapi";
import { useNotifications } from "@/hooks/vrc/useNotifications";
import { extractNotificationContent } from "@/lib/funcs/extractNotificationContent";
import { useTheme } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Text, RefreshControl } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { formatDateTimeShort } from "@/lib/date";
import { TouchableEx } from "@/components/CustomElements";
import { routeToGroup, routeToInstance, routeToUser } from "@/lib/route";
import { useUser } from "@/hooks/vrc/useUser";
import { useGroup } from "@/hooks/vrc/useGroup";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";

// --- NotificationItem Sub-component ---
const NotificationItem = ({ item }: { item: Notification }) => {
  const theme = useTheme();
  const { title, contents } = extractNotificationContent(item);
  const timestamp = item.created_at ? formatDateTimeShort(new Date(item.created_at).getTime()) : "";

  // Parse details safely
  const details = useMemo(() => {
    try {
      return typeof item.details === "string" && item.details !== ""
        ? JSON.parse(item.details)
        : item.details || {};
    } catch {
      return {};
    }
  }, [item.details]);

  // Check if it's a group notification
  const isGroup = item.type.startsWith("group") && !!details.groupId;

  // Fetch only necessary data
  const { data: user } = useUser(!isGroup ? item.senderUserId : undefined);
  const { data: group } = useGroup(isGroup ? details.groupId : undefined);

  const senderData = isGroup ? group : user;

  const handleChipPress = () => {
    if (isGroup && details.groupId) {
      routeToGroup(details.groupId);
      return;
    }
    if (item.type === "invite" && details.worldId) {
      routeToInstance(details.worldId, details.instanceId || "");
      return;
    }
    if (item.senderUserId) {
      routeToUser(item.senderUserId);
    }
  };

  return (
    <View style={[styles.notificationCard, { borderBottomColor: theme.colors.border }]}>

      {/* 1. Top Row: Notification Type and Timestamp */}
      <View style={styles.topRow}>
        <Text style={[styles.typeText, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.timestamp, { color: theme.colors.text }]}>
          {timestamp}
        </Text>
      </View>

      {/* 2. Middle Row: Sender Chip */}
      <View style={styles.chipRow}>
        {senderData ? (
          <TouchableEx onPress={handleChipPress} style={styles.chipTouchable}>
            <UserOrGroupChip data={senderData} size={32} />
          </TouchableEx>
        ) : (
          // Placeholder to prevent layout shift during loading
          <View style={{ height: 32 }} />
        )}
      </View>

      {/* 3. Bottom Row: Message Contents */}
      <View style={styles.contentContainer}>
        {contents.map((content, i) => (
          <Text
            style={[styles.content, { color: theme.colors.text }]}
            key={`notif-${item.id}-content-${i}`}
          >
            {content}
          </Text>
        ))}
      </View>

    </View>
  );
};

// --- Main Component ---
export default function Notifications() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: notifications, isFetching, refetch } = useNotifications();

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    return <NotificationItem item={item} />;
  }, []);

  const emptyComponent = useCallback(() => {
    if (isFetching && !notifications) {
      return <LoadingIndicator />;
    }
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.notifications.no_notifications")}
        </Text>
      </View>
    );
  }, [isFetching, notifications, theme.colors.text, t]);

  return (
    <GenericScreen>
      <View style={styles.container}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={styles.flatlistInner}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !!notifications}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
        />
      </View>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatlistInner: {
    paddingBottom: spacing.large,
  },
  notificationCard: {
    width: "100%",
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.small,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "capitalize", // Automatically capitalize type names like 'invite' to 'INVITE'
    opacity: 0.8,
    flex: 1,
    marginRight: spacing.small,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  chipRow: {
    marginBottom: spacing.mini,
  },
  chipTouchable: {
    alignSelf: "flex-start",
  },
  contentContainer: {
    paddingLeft: spacing.mini,
  },
  content: {
    marginTop: spacing.mini,
    fontSize: 14,
  },
  empty: {
    alignItems: "center",
    marginTop: spacing.large,
  },
});
