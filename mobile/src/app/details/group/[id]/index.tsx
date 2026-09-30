import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import CardViewGroupDetail from "@/components/view/item-CardView/detail/CardViewGroupDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/utils";
import { GroupMemberStatus } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { MenuItem } from "@/components/layout/type";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";
import { useGroup } from "@/hooks/vrc/useGroup";
import { useGroupInstances } from "@/hooks/vrc/useGroupInstances";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import ListViewGroupInstance from "@/components/view/item-ListView/ListViewGroupInstance";
import { routeToInstance } from "@/lib/route";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import GenericDialog from "@/components/layout/GenericDialog";
import LinkChip from "@/components/view/chip-badge/LinkChip";

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const theme = useTheme();

  const [mode, setMode] = useState<"info" | "instances">("info");
  const [openJson, setOpenJson] = useState(false);
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);
  const [openLeaveConfirmation, setOpenLeaveConfirmation] = useState(false);
  const { showToast } = useToast();

  const { data: group, refetch } = useGroup(id);
  const {
    data: instances,
    refetch: refetchInstances,
    isLoading: isLoadingInstances,
    error: instancesError,
  } = useGroupInstances(id, mode === "instances");
  const { isRefreshing: isRefreshingGroup, onRefresh: refreshGroup } =
    usePullToRefresh(refetch);
  const { isRefreshing: isRefreshingInstances, onRefresh: refreshInstances } =
    usePullToRefresh(refetchInstances);
  const isMember = group?.membershipStatus === GroupMemberStatus.Member;
  const isMembershipActionAvailable =
    !!group &&
    group.membershipStatus !== GroupMemberStatus.Requested &&
    group?.membershipStatus !== GroupMemberStatus.Banned &&
    group?.membershipStatus !== GroupMemberStatus.Userblocked;
  const updateMembership = useCallback(async () => {
    if (!group || isUpdatingMembership) return;

    setIsUpdatingMembership(true);
    try {
      if (isMember) {
        await vrc.groupsApi.leaveGroup({ groupId: group.id ?? id });
      } else {
        await vrc.groupsApi.joinGroup({ groupId: group.id ?? id });
      }
      await refetch();
    } catch (error) {
      showToast(
        "error",
        t("features.group.toast_update_failed"),
        extractErrMsg(error),
      );
    } finally {
      setIsUpdatingMembership(false);
    }
  }, [group, id, isMember, isUpdatingMembership, refetch, showToast, t, vrc.groupsApi]);
  const requestMembershipUpdate = useCallback(() => {
    if (!isMembershipActionAvailable) return;
    if (isMember) {
      setOpenLeaveConfirmation(true);
      return;
    }
    void updateMembership();
  }, [isMember, isMembershipActionAvailable, updateMembership]);
  const membershipMenuTitle = isUpdatingMembership
    ? t("features.group.membership_updating")
    : isMember
      ? t("features.group.membership_leave")
      : group?.membershipStatus === GroupMemberStatus.Requested
        ? t("features.group.membership_requested")
        : isMembershipActionAvailable
          ? t("features.group.membership_join")
          : t("features.group.membership_unavailable");
  const confirmLeaveGroup = useCallback(() => {
    setOpenLeaveConfirmation(false);
    void updateMembership();
  }, [updateMembership]);

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: "circle-medium",
        title: membershipMenuTitle,
        onPress: isMembershipActionAvailable
          ? requestMembershipUpdate
          : undefined,
      },
      {
        icon: "circle-medium",
        title: t("features.group.instances"),
        onPress: () => setMode("instances"),
      },
      {
        type: "divider",
        hidden: !enableJsonViewer,
      },
      {
        icon: "code-json",
        title: t("pages.detail_group.menuLabel_json"),
        onPress: () => setOpenJson(true),
        hidden: !enableJsonViewer,
      },
    ],
    [enableJsonViewer, isMembershipActionAvailable, membershipMenuTitle, requestMembershipUpdate, t],
  );

  useSideMenu(menuItems);

  const tabItems: {
    label: string;
    value: typeof mode;
  }[] = [
    {
      label: t("features.group.info_tab"),
      value: "info",
    },
    {
      label: t("features.group.instances_tab"),
      value: "instances",
    },
  ];

  return (
    <GenericScreen>
      {group ? (
        <View style={{ flex: 1 }}>
          {((mode === "info" && isRefreshingGroup) ||
            (mode === "instances" && isRefreshingInstances)) && (
            <LoadingIndicator absolute overlayOnly />
          )}
          <CardViewGroupDetail group={group} style={[styles.cardView]} />
          <SelectGroupButton
            data={tabItems}
            nameExtractor={(item) => item.label}
            keyExtractor={(item) => item.value}
            value={tabItems.find((item) => item.value === mode) ?? null}
            onChange={(item) => setMode(item.value)}
          />
          {mode === "instances" ? (
            <FlatList
              data={instances ?? []}
              renderItem={({ item }) => (
                <ListViewGroupInstance
                  instance={item}
                  onPress={() =>
                    routeToInstance(item.world.id, item.instanceId)
                  }
                />
              )}
              keyExtractor={(item) => item.location}
              ListEmptyComponent={() =>
                isLoadingInstances ? (
                  <LoadingIndicator absolute />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={{ color: theme.colors.subText }}>
                      {instancesError
                        ? t("features.group.load_instances_failed")
                        : t("features.group.no_active_instances")}
                    </Text>
                  </View>
                )
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingInstances}
                  onRefresh={refreshInstances}
                />
              }
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingGroup}
                  onRefresh={refreshGroup}
                />
              }
            >
              <DetailItemContainer
                title={t("features.group.description")}
              >
                <View style={styles.detailItemContent}>
                  <Text style={{ color: theme.colors.text }}>
                    {group.description || t("features.group.no_description")}
                  </Text>
                </View>
              </DetailItemContainer>

              <DetailItemContainer
                title={t("features.group.information")}
              >
                <View style={styles.detailItemContent}>
                  <Text style={{ color: theme.colors.text }}>
                    {t("features.group.members", {
                      count: group.memberCount ?? 0,
                    })}
                  </Text>
                  <Text style={{ color: theme.colors.text }}>
                    {t("features.group.status", {
                      status: t(
                        `features.group.status_${group.membershipStatus ?? "none"}`,
                      ),
                    })}
                  </Text>
                  {group.languages && group.languages.length > 0 && (
                    <Text style={{ color: theme.colors.text }}>
                      {t("features.group.languages", {
                        languages: group.languages.join(", "),
                      })}
                    </Text>
                  )}
                  {group.links?.map((link) => <LinkChip key={link} url={link} />)}
                </View>
              </DetailItemContainer>
            </ScrollView>
          )}
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      {/* Modals */}
      <JsonDataModal open={openJson} setOpen={setOpenJson} data={group} />
      <GenericDialog
        open={openLeaveConfirmation}
        message={t("components.confirmDialog.leave_group_message", {
          groupName: group?.name ?? "",
        })}
        onConfirm={confirmLeaveGroup}
        onCancel={() => setOpenLeaveConfirmation(false)}
        confirmTitle={t("components.confirmDialog.leave")}
        cancelTitle={t("components.confirmDialog.cancel")}
        colorConfirm={theme.colors.error}
      />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: navigationBarHeight,
  },
  cardView: {
    position: "relative",
    paddingVertical: spacing.medium,
  },
  badgeContainer: {
    position: "absolute",
    width: "100%",
    top: spacing.medium,
    bottom: spacing.medium,
    borderRadius: radius.small,
    padding: spacing.medium,
  },
  badge: {
    padding: spacing.small,
    width: "20%",
    aspectRatio: 1,
  },

  detailItemContent: {
    flex: 1,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
  listContent: {
    paddingTop: spacing.small,
    paddingBottom: navigationBarHeight + spacing.medium,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: spacing.large,
  },
});
