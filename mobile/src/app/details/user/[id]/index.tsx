import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import LinkChip from "@/components/view/chip-badge/LinkChip";
import CardViewUserDetail from "@/components/view/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { CachedImage, useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { getFriendRequestStatus, getInstanceType, getUserIconUrl, getUserProfilePicUrl, parseLocationString } from "@/libs/vrchat";
import { User } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { routeToInstance, routeToUserGroups, routeToUserWorlds } from "@/libs/route";
import BadgeChip from "@/components/view/chip-badge/BadgeChip";
import { useData } from "@/contexts/DataContext";
import ImagePreview from "@/components/view/ImagePreview";
import { MenuItem } from "@/components/layout/type";
import ChangeNoteModal from "@/components/modals/ChangeNoteModal";
import ChangeFavoriteModal from "@/components/modals/ChangeFavoriteModal";
import ChangeFriendModal from "@/components/modals/ChangeFriendModal";
import { RefreshControl } from "react-native-gesture-handler";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { TouchableEx } from "@/components/CustomElements";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const cache = useCache();
  const data = useData();
  const { showToast } = useToast();
  const theme = useTheme();
  const [user, setUser] = useState<User>();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const [locationInfo, setLocationInfo] = useState<{
    wId?: string;
    iId?: string;
    image?: string | undefined;
    baseInfo: string | undefined;
    instType?: string | undefined;
    capacity?: string | undefined;
  }>();

  const [preview, setPreview] = useState({ imageUrl: "", open: false });

  const [openJson, setOpenJson] = useState(false);
  const [openChangeNote, setOpenChangeNote] = useState(false);
  const [openChangeFriend, setOpenChangeFriend] = useState(false);
  const [openChangeFavorite, setOpenChangeFavorite] = useState(false);

  const isFavorite = data.favorites.data.some(fav => fav.favoriteId === id && fav.type === "friend");

  const fetchUser = () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    cache.user.get(id, true) // force latest data
      .then(setUser)
      .catch((e) => showToast("error", "Error fetching user profile", extractErrMsg(e)))
      .finally(() => fetchingRef.current = false);
  }

  const fetchLocationInfo = async () => {
    if (!user?.location) return;
    const { isOffline, isPrivate, isTraveling, parsedLocation } = parseLocationString(
      user?.location
    );
    if (isOffline) {
      setLocationInfo({
        baseInfo: t("pages.detail_user.userLocation_offline"),
      });
    } else if (isPrivate) {
      setLocationInfo({
        baseInfo: t("pages.detail_user.userLocation_private"),
      });
    } else if (isTraveling) {
      setLocationInfo({
        baseInfo: t("pages.detail_user.userLocation_traveling"),
      });
    } else if (parsedLocation?.worldId && parsedLocation?.instanceId) {
      try {
        const res = await vrc.instancesApi.getInstance({
          worldId: parsedLocation.worldId,
          instanceId: parsedLocation.instanceId,
        });
        if (res.data) {
          setLocationInfo({
            wId: res.data.worldId,
            iId: res.data.instanceId,
            image: res.data.world?.thumbnailImageUrl,
            baseInfo: `${res.data.world?.name}`,
            instType: `${getInstanceType(res.data.type)} #${res.data.name}${res.data.displayName ? ` (${res.data.displayName})` : ""}`,
            capacity: `${res.data.n_users}/${res.data.capacity}`,
          });
        }
      } catch (error) {
        showToast("error", "Error fetching current location", extractErrMsg(error));
      }
    } else {
      setLocationInfo({
        baseInfo: t("pages.detail_user.userLocation_unknown"),
      });
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchLocationInfo();
  }, [user?.location]);

  const freReqStatus = user ? getFriendRequestStatus(user) : "null";

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: freReqStatus === "completed" ? "account-minus" : freReqStatus === "null" ? "account-plus" : "account-cancel",
      title: freReqStatus === "completed" ? t("pages.detail_user.menuLabel_friend_remove")
        : freReqStatus === "null" ? t("pages.detail_user.menuLabel_friend_sendRequest")
          : t("pages.detail_user.menuLabel_friend_cancelRequest"),
      onPress: () => setOpenChangeFriend(true)
    },
    {
      icon: isFavorite ? "heart" : "heart-plus",
      title: isFavorite ? t("pages.detail_user.menuLabel_favoriteGroup_edit") : t("pages.detail_user.menuLabel_favoriteGroup_add"),
      onPress: () => setOpenChangeFavorite(true),
      hidden: freReqStatus !== "completed"
    },
    {
      icon: "note-edit-outline",
      title: t("pages.detail_user.menuLabel_note_edit"),
      onPress: () => setOpenChangeNote(true),
    },
    {
      type: "divider",
      hidden: freReqStatus !== "completed"
    },
    {
      icon: "circle-medium",
      title: locationInfo?.iId ? t("pages.detail_user.menuLabel_invite_me") : t("pages.detail_user.menuLabel_invite_request"),
      // onPress: () => {},
      hidden: freReqStatus !== "completed"
    },
    {
      icon: "circle-medium",
      title: t("pages.detail_user.menuLabel_invite_send"),
      // onPress: () => {},
      hidden: freReqStatus !== "completed"
    },
    {
      type: "divider",
    },
    {
      icon: "forest",
      title: t("pages.detail_user_worlds.label"),
      onPress: () => user && routeToUserWorlds(user.id),
    },
    {
      icon: "diversity-3",
      title: t("pages.detail_user_groups.label"),
      onPress: () => user && routeToUserGroups(user.id),
    },
    {
      type: "divider",
      hidden: !enableJsonViewer,
    },
    {
      icon: "code-json",
      title: t("pages.detail_user.menuLabel_json"),
      onPress: () => setOpenJson(true),
      hidden: !enableJsonViewer,
    },

  ], [freReqStatus, isFavorite, locationInfo, enableJsonViewer, t]);

  useSideMenu(menuItems);

  return (
    <GenericScreen>
      {user ? (
        <View style={{ flex: 1 }}>
          <CardViewUserDetail
            user={user}
            onPress={() => user && setPreview({ imageUrl: getUserProfilePicUrl(user, true), open: true })}
            onPressIcon={() => user && setPreview({ imageUrl: getUserIconUrl(user, true), open: true })}
            style={[styles.cardView]}
          />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={fetchUser}
              />
            }
          >

            <DetailItemContainer title={t("pages.detail_user.sectionLabel_location")}>
              {locationInfo ? (
                <TouchableEx
                  style={styles.location}
                  onPress={(locationInfo.wId && locationInfo.iId) ? () => routeToInstance(locationInfo.wId!, locationInfo.iId!) : undefined}
                >
                  {locationInfo?.image && (
                    <CachedImage
                      style={styles.detailItemImage}
                      src={locationInfo?.image ?? ""}
                    />
                  )}
                  <View style={styles.detailItemContent}>
                    {locationInfo?.baseInfo && (
                      <Text numberOfLines={1} style={{ color: theme.colors.text }}>
                        {locationInfo?.baseInfo}
                      </Text>
                    )}
                    {locationInfo?.instType && (
                      <Text numberOfLines={1} style={{ color: theme.colors.text }}>
                        {locationInfo?.instType}
                      </Text>
                    )}
                    {locationInfo?.capacity && (
                      <Text numberOfLines={1} style={{ color: theme.colors.text }}>
                        {locationInfo?.capacity}
                      </Text>
                    )}
                  </View>
                </TouchableEx>
              ) : (
                <LoadingIndicator size={30} />
              )}

            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_user.sectionLabel_note")}>
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>{user.note}</Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_user.sectionLabel_bio")}>
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>{user.bio}</Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_user.sectionLabel_bio_links")}>
              <View style={styles.detailItemContent}>
                {user.bioLinks.map((link, index) => (
                  <LinkChip key={index} url={link} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_user.sectionLabel_badges")}>
              <View style={[styles.detailItemContent, styles.horizontal]}>
                {user.badges?.map((badge) => (
                  <BadgeChip key={badge.badgeId} badge={badge} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_user.sectionLabel_info")}>
              <View style={styles.detailItemContent}>
                {user.last_activity && (
                  <Text style={{ color: theme.colors.text }}>
                    {t("pages.detail_user.section_info_last_activity", { date: new Date(user.last_activity) })}
                  </Text>
                )}
                <Text style={{ color: theme.colors.text }}>
                  {t("pages.detail_user.section_info_joined", { date: new Date(user.date_joined) })}
                </Text>
              </View>
            </DetailItemContainer>

          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      {/* dialog and modals */}
      <JsonDataModal open={openJson} setOpen={setOpenJson} data={user} />
      <ImagePreview
        imageUrls={[preview.imageUrl]}
        open={preview.open}
        onClose={() => setPreview({ imageUrl: "", open: false })}
      />
      <ChangeNoteModal
        open={openChangeNote}
        setOpen={setOpenChangeNote}
        user={user}
        onSuccess={fetchUser}
      />
      <ChangeFavoriteModal
        open={openChangeFavorite}
        setOpen={setOpenChangeFavorite}
        item={user}
        type="friend"
        onSuccess={data.favorites.fetch}
      />
      <ChangeFriendModal
        open={openChangeFriend}
        setOpen={setOpenChangeFriend}
        user={user}
        onSuccess={fetchUser}
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
  location: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radius.small,
    padding: spacing.small
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
  horizontal: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
});
