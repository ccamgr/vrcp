import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import CardViewGroupDetail from "@/components/view/item-CardView/detail/CardViewGroupDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { CachedImage, useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { CalendarEvent } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { MenuItem } from "@/components/layout/type";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import CardViewEventDetail from "@/components/view/item-CardView/detail/CardViewEventDetail";
import { GroupLike } from "@/libs/vrchat";
import { TouchableEx } from "@/components/CustomElements";
import { routeToGroup } from "@/libs/route";
import IconSymbol from "@/components/view/icon-components/IconView";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [groupId, calendarId] = id?.split(":") ?? [];
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const cache = useCache();
  const theme = useTheme();
  const { showToast } = useToast();
  const [event, setEvent] = useState<CalendarEvent>();
  const [ownerGroup, setOwnerGroup] = useState<GroupLike>();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);

  const [openJson, setOpenJson] = useState(false);


  const fetchEvent = () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    vrc.calendarApi.getGroupCalendarEvent({
      groupId: groupId ?? "",
      calendarId: calendarId ?? "",
    })
      .then((res) => setEvent(res.data))
      .catch((e) => showToast("error", "Error fetching event data", extractErrMsg(e)))
      .finally(() => fetchingRef.current = false);
  };
  const fetchOwnerGroup = () => {
    cache.group.get(groupId ?? "")
      .then(setOwnerGroup)
      .catch((e) => console.warn("Error fetching owner group data", extractErrMsg(e)));
  };

  useEffect(() => {
    fetchEvent();
    fetchOwnerGroup();
  }, []);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: "circle-medium",
      title: "SUBSCRIBE or UNSUBSCRIBE THIS EVENT", // notify me
      // onPress: () => {},
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
  ], [enableJsonViewer, t]);
  useSideMenu(menuItems);

  return (
    <GenericScreen>
      {event ? (
        <View style={{ flex: 1 }}>
          <CardViewEventDetail event={event} style={[styles.cardView]} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={fetchEvent}
              />
            }
          >

            {ownerGroup && ownerGroup.id && (
              <DetailItemContainer title={t("pages.detail_event.sectionLabel_owner")}>
                <View style={styles.detailItemContent}>
                  <TouchableEx style={styles.ownerChip} onPress={() => ownerGroup.id && routeToGroup(ownerGroup.id)}>
                    <UserOrGroupChip data={ownerGroup} />
                  </TouchableEx>
                </View>
              </DetailItemContainer>
            )}

            <DetailItemContainer title={t("pages.detail_event.sectionLabel_description")}>
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>{event.description}</Text>
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
    flex: 1
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
