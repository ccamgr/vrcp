import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import PlatformChips from "@/components/view/chip-badge/PlatformChips";
import TagChips from "@/components/view/chip-badge/TagChips";
import CardViewWorldDetail from "@/components/view/item-CardView/detail/CardViewWorldDetail";
import ListViewInstance from "@/components/view/item-ListView/ListViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/utils";
import {
  getAuthorTags,
  getPlatform,
  getTrustRankColor,
  InstanceLike,
  parseInstanceId,
} from "@/lib/vrchat";
import { User, World } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import { routeToSearch, routeToUser } from "@/lib/route";
import { useData } from "@/contexts/DataContext";
import { MenuItem } from "@/components/layout/type";
import ChangeFavoriteModal from "@/components/modals/ChangeFavoriteModal";
import { RefreshControl } from "react-native-gesture-handler";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { TouchableEx } from "@/components/CustomElements";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";

export default function WorldDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const cache = useCache();
  const data = useData();
  const { showToast } = useToast();
  const theme = useTheme();
  const [world, setWorld] = useState<World>();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const [author, setAuthor] = useState<User>();
  const [mode, setMode] = useState<"info" | "instance">("info");

  const [openJson, setOpenJson] = useState(false);
  const [openChangeFavorite, setOpenChangeFavorite] = useState(false);

  const isFavorite = data.favorites.data.some(fav => fav.favoriteId === id && fav.type === "world");

  const fetchWorld = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    cache.world.get(id, true)
      .then(setWorld)
      .catch((e) => showToast("error", "Error fetching user profile", extractErrMsg(e)))
      .finally(() => fetchingRef.current = false);
  };

  useEffect(() => {
    fetchWorld();
  }, []);


  useEffect(() => {
    if (!world?.authorId) return;
    cache.user.get(world.authorId).then((u) => setAuthor(u)).catch((e) => {
      showToast("error", "Error fetching author profile", extractErrMsg(e));
    })
  }, [world?.authorId])

  const formatAndSortInstances = (
    instances: any[][] | undefined
  ): InstanceLike[] => {
    const parsedInstances = [] as InstanceLike[];
    instances?.forEach((item) => {
      const [id, n_users] = item;
      if (typeof id !== "string" || typeof n_users !== "number") return;
      const parsed = parseInstanceId(id);
      if (!parsed) return;
      const instance = {
        id: id,
        instanceId: id,
        worldId: world?.id ?? "",
        name: parsed?.name,
        type: parsed.type,
        groupAccessType: parsed?.groupAccessType,
        n_users: n_users,
        capacity: world?.capacity ?? 0,
        region: parsed?.region ?? "unknown",
      };
      parsedInstances.push(instance);
    });
    const sortedInstances = parsedInstances.sort(
      (a, b) => b.n_users - a.n_users
    );
    return sortedInstances;
  };



  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: isFavorite ? "heart" : "heart-plus",
      title: isFavorite ? t("pages.detail_world.menuLabel_favoriteGroup_edit") : t("pages.detail_world.menuLabel_favoriteGroup_add"),
      onPress: () => setOpenChangeFavorite(true),
    },
    {
      icon: "circle-medium",
      title: "CREATE INSTANCE", // => Invite myself
      // onPress: () => {},
    },
    {
      type: "divider",
      hidden: !enableJsonViewer,
    },
    {
      icon: "code-json",
      title: t("pages.detail_world.menuLabel_json"),
      onPress: () => setOpenJson(true),
      hidden: !enableJsonViewer,
    },
  ], [isFavorite, enableJsonViewer, t]);

  useSideMenu(menuItems);

  const tabItems: {
    label: string;
    value: typeof mode,
  }[] = [
      {
        label: t("pages.detail_world.tabLabel_info"),
        value: "info",
      },
      {
        label: t("pages.detail_world.tabLabel_instances"),
        value: "instance",
      },
    ];

  return (
    <GenericScreen>
      {world ? (
        <View style={{ flex: 1 }}>
          <CardViewWorldDetail world={world} style={[styles.cardView]} />

          <SelectGroupButton
            data={tabItems}
            nameExtractor={(item) => item.label}
            keyExtractor={(item) => item.value}
            value={tabItems.find((item) => item.value === mode) ?? null}
            onChange={(item) => setMode(item.value)}
          />

          {mode === "info" && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={fetchWorld}
                />
              }>
              <DetailItemContainer title={t("pages.detail_world.sectionLabel_platform")}>
                <View style={styles.detailItemContent}>
                  <PlatformChips platforms={getPlatform(world)} />
                </View>
              </DetailItemContainer>

              <DetailItemContainer title={t("pages.detail_world.sectionLabel_description")}>
                <View style={styles.detailItemContent}>
                  <Text style={{ color: theme.colors.text }}>
                    {world.description}
                  </Text>
                </View>
              </DetailItemContainer>

              <DetailItemContainer title={t("pages.detail_world.sectionLabel_tags")}>
                <View style={styles.detailItemContent}>
                  <TagChips tags={getAuthorTags(world)} onPress={(tag) => routeToSearch(tag)} />
                </View>
              </DetailItemContainer>

              <DetailItemContainer title={t("pages.detail_world.sectionLabel_author")}>
                {author && (
                  <View style={styles.detailItemContent}>
                    <TouchableEx onPress={() => routeToUser(author.id)}  >
                      <UserOrGroupChip data={author} textColor={getTrustRankColor(author, true, false)} />
                    </TouchableEx>
                  </View>
                )}
              </DetailItemContainer>

              <DetailItemContainer title={t("pages.detail_world.sectionLabel_info")}>
                <View style={styles.detailItemContent}>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{t("pages.detail_world.section_info_capacityAndRecommended", { capacity: world.capacity, recommendedCapacity: world.recommendedCapacity })}</Text>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{t("pages.detail_world.section_info_visits", { visits: world.visits })}</Text>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{t("pages.detail_world.section_info_updated", { date: new Date(world.updated_at) })}</Text>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{t("pages.detail_world.section_info_created", { date: new Date(world.created_at) })}</Text>
                </View>
              </DetailItemContainer>

            </ScrollView>
          )}

          {mode === "instance" && (
            <FlatList
              data={formatAndSortInstances(world.instances)}
              renderItem={({ item }) => <ListViewInstance instance={item} />}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", marginTop: spacing.large }}>
                  <Text style={{ color: theme.colors.text }}>
                    {t("pages.detail_world.no_instances")}
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.listInner}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={fetchWorld}
                />
              }
            />
          )}
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      {/* dialog and modals */}

      <JsonDataModal open={openJson} setOpen={setOpenJson} data={world} />
      <ChangeFavoriteModal
        open={openChangeFavorite}
        setOpen={setOpenChangeFavorite}
        item={world}
        type="world"
        onSuccess={data.favorites.fetch}
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
  listInner: {
    paddingTop: spacing.small,
    paddingBottom: navigationBarHeight + spacing.medium,
  },

  detailItemContent: {
    flex: 1,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
  detailItemImage: {
    marginRight: spacing.small,
    height: spacing.small * 2 + fontSize.medium * 3,
    aspectRatio: 16 / 9,
  },
});
