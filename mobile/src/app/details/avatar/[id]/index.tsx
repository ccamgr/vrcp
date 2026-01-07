import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import CardViewAvatarDetail from "@/components/view/item-CardView/detail/CardViewAvatarDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { Avatar, User } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { routeToUser } from "@/libs/route";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import { getAuthorTags, getPlatform, getTrustRankColor } from "@/libs/vrchat";
import PlatformChips from "@/components/view/chip-badge/PlatformChips";
import TagChips from "@/components/view/chip-badge/TagChips";
import { useData } from "@/contexts/DataContext";
import { MenuItem } from "@/components/layout/type";
import ChangeFavoriteModal from "@/components/modals/ChangeFavoriteModal";
import { enableExperimentalWebImplementation, RefreshControl } from "react-native-gesture-handler";
import JsonDataModal from "@/components/modals/JsonDataModal";
import ChangeAvatarModal from "@/components/modals/ChangeAvatarModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { TouchableEx } from "@/components/CustomElements";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";

export default function AvatarDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const cache = useCache();
  const data = useData();
  const theme = useTheme();
  const { t } = useTranslation();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const [avatar, setAvatar] = useState<Avatar>();
  const [author, setAuthor] = useState<User>();

  const [openJson, setOpenJson] = useState(false);
  const [openChangeFavorite, setOpenChangeFavorite] = useState(false);
  const [openChangeAvatar, setOpenChangeAvatar] = useState(false);

  const isFavorite = data.favorites.data.some(fav => fav.favoriteId === id && fav.type === "avatar");

  const fetchAvatar = () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    cache.avatar.get(id, true)
      .then(setAvatar)
      .catch((e) => showToast("error", "Error fetching avatar data", extractErrMsg(e)))
      .finally(() => fetchingRef.current = false);
  };

  useEffect(() => {
    fetchAvatar();
  }, []);

  useEffect(() => {
    if (!avatar?.authorId) return;
    cache.user.get(avatar.authorId).then((u) => setAuthor(u)).catch((e) => showToast("error", "Error fetching author data", extractErrMsg(e)));
  }, [avatar?.authorId])


  const isCurrentAvatar = data.currentUser.data?.currentAvatar === avatar?.id;

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: isFavorite ? "heart" : "heart-plus",
      title: isFavorite ? t("pages.detail_avatar.menuLabel_favoriteGroup_edit") : t("pages.detail_avatar.menuLabel_favoriteGroup_add"),
      onPress: () => setOpenChangeFavorite(true),
    },
    {
      type: "divider",
      hidden: !isFavorite && avatar?.authorId !== data.currentUser.data?.id,
    },
    {
      icon: isCurrentAvatar ? "tshirt-crew-outline" : "tshirt-crew",
      title: isCurrentAvatar ? t("pages.detail_avatar.menuLabel_avatar_nowUsing") : t("pages.detail_avatar.menuLabel_avatar_changeTo"),
      onPress: () => !isCurrentAvatar && setOpenChangeAvatar(true),
      hidden: !isFavorite && avatar?.authorId !== data.currentUser.data?.id,
    },
    {
      type: "divider",
      hidden: !enableJsonViewer,
    },
    {
      icon: "code-json",
      title: t("pages.detail_avatar.menuLabel_json"),
      onPress: () => setOpenJson(true),
      hidden: !enableJsonViewer,
    },
  ], [isFavorite, isCurrentAvatar, avatar, enableJsonViewer, t, data.currentUser.data]);

  useSideMenu(menuItems);

  return (
    <GenericScreen>
      {avatar ? (
        <View style={{ flex: 1 }}>
          <CardViewAvatarDetail avatar={avatar} style={[styles.cardView]} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={fetchAvatar}
              />
            }
          >

            <DetailItemContainer title={t("pages.detail_avatar.sectionLabel_platform")}>
              <View style={styles.detailItemContent}>
                <PlatformChips platforms={getPlatform(avatar)} />
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_avatar.sectionLabel_description")}>
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {avatar.description}
                </Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_avatar.sectionLabel_tags")}>
              <View style={styles.detailItemContent}>
                <TagChips tags={getAuthorTags(avatar)} />
              </View>
            </DetailItemContainer>


            <DetailItemContainer title={t("pages.detail_avatar.sectionLabel_author")}>
              {author && (
                <View style={styles.detailItemContent}>
                  <TouchableEx onPress={() => routeToUser(author.id)}  >
                    <UserOrGroupChip data={author} textColor={getTrustRankColor(author, true, false)} />
                  </TouchableEx>
                </View>
              )}
            </DetailItemContainer>

          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}


      {/* dialog and modals */}

      <ChangeFavoriteModal
        open={openChangeFavorite}
        setOpen={setOpenChangeFavorite}
        item={avatar}
        type="avatar"
        onSuccess={data.favorites.fetch}
      />
      <ChangeAvatarModal
        open={openChangeAvatar}
        setOpen={setOpenChangeAvatar}
        avatar={avatar}
        onSuccess={data.currentUser.fetch}
      />
      <JsonDataModal open={openJson} setOpen={setOpenJson} data={avatar} />
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
  detailItemImage: {
    marginRight: spacing.small,
    height: spacing.small * 2 + fontSize.medium * 3,
    aspectRatio: 16 / 9,
  },
});
