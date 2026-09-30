import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/utils";
import { CalendarEvent } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { MenuItem } from "@/components/layout/type";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import CardViewEventDetail from "@/components/view/item-CardView/detail/CardViewEventDetail";
import { TouchableEx } from "@/components/CustomElements";
import { routeToGroup } from "@/lib/route";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";
import { useGroup } from "@/hooks/vrc/useGroup";

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groupId, calendarId] = id?.split(":") ?? [];
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const [event, setEvent] = useState<CalendarEvent>();
  const fetchingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  const [openJson, setOpenJson] = useState(false);

  const { data: ownerGroup } = useGroup(groupId ?? "");

  const fetchEvent = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const response = await vrc.calendarApi.getGroupCalendarEvent({
        groupId: groupId ?? "",
        calendarId: calendarId ?? "",
      });
      setEvent(response.data);
    } catch (error) {
      showToast(
        "error",
        t("features.event.load_failed"),
        extractErrMsg(error),
      );
    } finally {
      fetchingRef.current = false;
    }
  }, [calendarId, groupId, showToast, t, vrc.calendarApi]);
  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  const refreshEvent = async () => {
    if (isRefreshing || fetchingRef.current) return;

    setIsRefreshing(true);
    try {
      await fetchEvent();
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFollow = useCallback(async () => {
    if (!event || !groupId || isUpdatingFollow) return;

    setIsUpdatingFollow(true);
    try {
      const response = await vrc.calendarApi.followGroupCalendarEvent({
        groupId,
        calendarId: event.id,
        followCalendarEventRequest: {
          isFollowing: !event.userInterest?.isFollowing,
        },
      });
      setEvent(response.data);
    } catch (error) {
      showToast(
        "error",
        t("features.event.follow_update_failed"),
        extractErrMsg(error),
      );
    } finally {
      setIsUpdatingFollow(false);
    }
  }, [event, groupId, isUpdatingFollow, showToast, t, vrc.calendarApi]);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: "circle-medium",
        title: isUpdatingFollow
          ? t("features.event.follow_updating")
          : event?.userInterest?.isFollowing
            ? t("features.event.unfollow")
            : t("features.event.follow"),
        onPress: () => void toggleFollow(),
      },
      {
        type: "divider",
        hidden: !enableJsonViewer,
      },
      {
        icon: "code-json",
        title: t("pages.detail_event.menuLabel_json"),
        onPress: () => setOpenJson(true),
        hidden: !enableJsonViewer,
      },
    ],
    [enableJsonViewer, event?.userInterest?.isFollowing, isUpdatingFollow, t, toggleFollow],
  );
  useSideMenu(menuItems);

  return (
    <GenericScreen>
      {event ? (
        <View style={{ flex: 1 }}>
          {isRefreshing && <LoadingIndicator absolute overlayOnly />}
          <CardViewEventDetail event={event} style={[styles.cardView]} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshEvent}
              />
            }
          >
            {ownerGroup && ownerGroup.id && (
              <DetailItemContainer
                title={t("pages.detail_event.sectionLabel_owner")}
              >
                <View style={styles.detailItemContent}>
                  <TouchableEx
                    style={styles.ownerChip}
                    onPress={() => ownerGroup.id && routeToGroup(ownerGroup.id)}
                  >
                    <UserOrGroupChip data={ownerGroup} />
                  </TouchableEx>
                </View>
              </DetailItemContainer>
            )}

            <DetailItemContainer
              title={t("pages.detail_event.sectionLabel_description")}
            >
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {event.description}
                </Text>
              </View>
            </DetailItemContainer>
          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      {/* Modals */}
      <JsonDataModal open={openJson} setOpen={setOpenJson} data={event} />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: navigationBarHeight,
  },
  horizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.small,
  },
  ownerChip: {
    flex: 1,
  },
  cardView: {
    position: "relative",
    paddingVertical: spacing.medium,
  },
  detailItemContent: {
    flex: 1,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
});
