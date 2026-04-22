import React, { useMemo, useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { RefreshControl } from "react-native-gesture-handler";

// Components
import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import PlatformChips from "@/components/view/chip-badge/PlatformChips";
import TagChips from "@/components/view/chip-badge/TagChips";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import CardViewInstanceDetail from "@/components/view/item-CardView/detail/CardViewInstanceDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import JsonDataModal from "@/components/modals/JsonDataModal";
import CachedImage from "@/components/CachedImage";
import { TouchableEx } from "@/components/CustomElements";

// Hooks & Contexts
import { useVRChat } from "@/contexts/VRChatContext";
import { useToast } from "@/contexts/ToastContext";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";
import { useFriends } from "@/hooks/vrc/useFriends";
import { useUser } from "@/hooks/vrc/useUser";
import { useGroup } from "@/hooks/vrc/useGroup";

// Utils
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { extractErrMsg } from "@/lib/utils";
import {
  getAuthorTags,
  getTrustRankColor,
  getPlatform,
  parseLocationString,
} from "@/lib/vrchat";
import { routeToGroup, routeToSearch, routeToUser, routeToWorld } from "@/lib/route";
import { MenuItem } from "@/components/layout/type";
import { Instance } from "@/generated/vrcapi";

export default function InstanceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); // locationStr
  const { parsedLocation } = parseLocationString(id);
  const worldId = parsedLocation?.worldId;
  const instanceId = parsedLocation?.instanceId;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const theme = useTheme();
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;

  // 1. Manual State Management for Instance
  const [instance, setInstance] = useState<Instance | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInstance = useCallback(async () => {
    if (!worldId || !instanceId || !vrc.instancesApi) return;

    setIsLoading(true);
    try {
      const res = await vrc.instancesApi.getInstance({ worldId, instanceId });
      setInstance(res.data);
    } catch (e) {
      showToast("error", "Error fetching instance data", extractErrMsg(e));
    } finally {
      setIsLoading(false);
    }
  }, [worldId, instanceId, vrc.instancesApi]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  // 2. Owner Information (Keep Hooks at top level)
  const ownerId = instance?.ownerId ?? "";
  const isUserOwner = ownerId.startsWith("usr_");
  const isGroupOwner = ownerId.startsWith("grp_");

  // These hooks will only run if the ID is valid (internal 'enabled' check)
  const { data: userOwner } = useUser(isUserOwner ? ownerId : undefined);
  const { data: groupOwner } = useGroup(isGroupOwner ? ownerId : undefined);

  const owner = useMemo(() => {
    if (isUserOwner && userOwner) return { type: "user" as const, data: userOwner };
    if (isGroupOwner && groupOwner) return { type: "group" as const, data: groupOwner };
    return null;
  }, [isUserOwner, userOwner, isGroupOwner, groupOwner]);

  // 3. Friends in this Instance
  const { data: allFriends } = useFriends();
  const friendsInInstance = useMemo(() => {
    if (!instance || !allFriends) return [];
    const location = `${instance.worldId}:${instance.instanceId}`;
    return allFriends.filter((f) => f.location === location);
  }, [instance, allFriends]);

  const [openJson, setOpenJson] = useState(false);

  // 4. Side Menu
  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: "circle-medium",
      title: "INVITE ME or REQUEST INVITE",
      onPress: () => { /* TODO: Implement Invite */ },
    },
    { type: "divider", hidden: !enableJsonViewer },
    {
      icon: "code-json",
      title: t("pages.detail_instance.menuLabel_json"),
      onPress: () => setOpenJson(true),
      hidden: !enableJsonViewer,
    },
  ], [enableJsonViewer, t]);

  useSideMenu(menuItems);

  if (!instance && isLoading) return <LoadingIndicator absolute />;

  return (
    <GenericScreen>
      {instance ? (
        <View style={{ flex: 1 }}>
          <CardViewInstanceDetail instance={instance} style={[styles.cardView]} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={fetchInstance}
              />
            }
          >
            {/* Friends in Instance */}
            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_usersInInstance")}>
              <View style={styles.detailItemContent}>
                {friendsInInstance.map((friend) => (
                  <TouchableEx style={styles.user} key={friend.id} onPress={() => routeToUser(friend.id)}>
                    <UserOrGroupChip data={friend} textColor={getTrustRankColor(friend, true, false)} />
                  </TouchableEx>
                ))}
                {instance.n_users > friendsInInstance.length && (
                  <Text style={[styles.moreUser, { color: theme.colors.text }]}>
                    {t("pages.detail_instance.section_users_more_user_count_other", {
                      count: instance.n_users - friendsInInstance.length
                    })}
                  </Text>
                )}
              </View>
            </DetailItemContainer>

            {/* World Info */}
            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_world")}>
              <View style={styles.detailItemContent}>
                <TouchableEx style={styles.horizontal} onPress={() => routeToWorld(instance.worldId)}>
                  <CachedImage src={instance.world.thumbnailImageUrl} style={[styles.worldImage, { borderColor: theme.colors.border }]} />
                  <Text style={[styles.worldName, { color: theme.colors.text }]}>
                    {instance.world.name}
                  </Text>
                </TouchableEx>
              </View>
            </DetailItemContainer>

            {/* Owner Info */}
            {owner && (
              <DetailItemContainer title={t("pages.detail_instance.sectionLabel_owner")}>
                <View style={styles.detailItemContent}>
                  <TouchableEx onPress={() => owner.data?.id && (owner.type === "user" ? routeToUser(owner.data.id) : routeToGroup(owner.data.id))}>
                    <UserOrGroupChip data={owner.data!} icon="crown" textColor={owner.type === "user" ? getTrustRankColor(owner.data as any, true, false) : undefined} />
                  </TouchableEx>
                </View>
              </DetailItemContainer>
            )}

            {/* Platforms & Tags */}
            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_platform")}>
              <View style={styles.detailItemContent}>
                <PlatformChips platforms={getPlatform(instance.world)} />
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_tags")}>
              <View style={styles.detailItemContent}>
                <TagChips tags={getAuthorTags(instance.world)} onPress={(tag) => routeToSearch(tag)} />
              </View>
            </DetailItemContainer>

            {/* Basic Info */}
            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_info")}>
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {t("pages.detail_instance.section_info_capacity", { capacity: instance.capacity })}
                </Text>
                <Text style={{ color: theme.colors.text }}>
                  {t("pages.detail_instance.section_info_ageGated", { ageGated: instance.ageGate })}
                </Text>
              </View>
            </DetailItemContainer>

          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      <JsonDataModal open={openJson} setOpen={setOpenJson} data={instance} />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: navigationBarHeight },
  horizontal: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.small },
  cardView: { position: "relative", paddingVertical: spacing.medium },
  user: { width: "100%" },
  moreUser: { alignSelf: "flex-end", marginRight: spacing.medium },
  detailItemContent: { flex: 1 },
  worldImage: { marginRight: spacing.small, height: spacing.small * 2 + fontSize.medium * 3, aspectRatio: 16 / 9, borderRadius: radius.small, borderWidth: 1 },
  worldName: { fontSize: fontSize.medium, flex: 1 }
});
