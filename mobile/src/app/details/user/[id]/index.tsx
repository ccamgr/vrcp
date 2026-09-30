import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import LinkChip from "@/components/view/chip-badge/LinkChip";
import CardViewUserDetail from "@/components/view/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import {
  fontSize,
  navigationBarHeight,
  radius,
  spacing,
} from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/utils";
import {
  getFriendRequestStatus,
  getInstanceType,
  getUserIconUrl,
  getUserProfilePicUrl,
  parseLocationString,
} from "@/lib/vrchat";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  routeToInstance,
  routeToMutualFriends,
  routeToMutualGroups,
  routeToUserGroups,
  routeToUserWorlds,
} from "@/lib/route";
import BadgeChip from "@/components/view/chip-badge/BadgeChip";
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
import { useFavorites } from "@/hooks/vrc/useFavorites";
import { useUser } from "@/hooks/vrc/useUser";
import { usePublicProfile } from "@/hooks/vrc/usePublicProfile";
import CachedImage from "@/components/CachedImage";
import { toUserPresentation } from "@/lib/vrcapiModels";
import { useAuth } from "@/contexts/AuthContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUserInvite } from "@/hooks/useUserInvite";
import { useSelfInvite } from "@/hooks/useSelfInvite";
import GenericDialog from "@/components/layout/GenericDialog";

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const theme = useTheme();
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
  const [pendingInviteAction, setPendingInviteAction] = useState<
    "request-or-invite" | "send" | null
  >(null);

  const { data: favorites, refetch: refetchFavorites } = useFavorites();
  const { data: user, refetch } = useUser(id);
  const {
    data: publicProfile,
    isError: isPublicProfileError,
    refetch: refetchPublicProfile,
  } = usePublicProfile(id);
  const displayUser = useMemo(
    () => (user ? toUserPresentation(user, publicProfile) : undefined),
    [user, publicProfile],
  );
  const refreshUser = useCallback(
    () => Promise.all([refetch(), refetchPublicProfile()]),
    [refetch, refetchPublicProfile],
  );
  const { isRefreshing, onRefresh } = usePullToRefresh(refreshUser);
  const { isSending, requestInvite, sendInvite } = useUserInvite(id);
  const { inviteMyself } = useSelfInvite();
  const requestOrInvite = useCallback(() => {
    if (locationInfo?.wId && locationInfo.iId) {
      void inviteMyself(locationInfo.wId, locationInfo.iId);
      return;
    }
    void requestInvite();
  }, [inviteMyself, locationInfo?.iId, locationInfo?.wId, requestInvite]);
  const confirmRequestOrInvite = useCallback(
    () => setPendingInviteAction("request-or-invite"),
    [],
  );
  const confirmSendInvite = useCallback(() => setPendingInviteAction("send"), []);
  const submitInviteAction = useCallback(() => {
    const action = pendingInviteAction;
    setPendingInviteAction(null);
    if (action === "request-or-invite") {
      requestOrInvite();
    } else if (action === "send") {
      sendInvite();
    }
  }, [pendingInviteAction, requestOrInvite, sendInvite]);
  const inviteDialogMessage =
    pendingInviteAction === "send"
      ? t("components.confirmDialog.invite_send_message")
      : locationInfo?.iId
        ? t("components.confirmDialog.invite_myself_message")
        : t("components.confirmDialog.invite_request_message");

  const isFavorite = favorites?.some(
    (fav) => fav.favoriteId === id && fav.type === "friend",
  );
  const canShowMutuals = !!auth.user?.id && auth.user.id !== id;

  const fetchLocationInfo = useCallback(async () => {
    if (!user?.location) return;
    const { isOffline, isPrivate, isTraveling, parsedLocation } =
      parseLocationString(user?.location);
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
        showToast(
          "error",
          t("features.user.location_load_failed"),
          extractErrMsg(error),
        );
      }
    } else {
      setLocationInfo({
        baseInfo: t("pages.detail_user.userLocation_unknown"),
      });
    }
  }, [showToast, t, user?.location, vrc.instancesApi]);

  useEffect(() => {
    refetch().catch((e) =>
      showToast(
        "error",
        t("features.user.load_failed"),
        extractErrMsg(e),
      ),
    );
  }, [refetch, showToast, t]);

  useEffect(() => {
    void fetchLocationInfo();
  }, [fetchLocationInfo]);

  const freReqStatus = user ? getFriendRequestStatus(user) : "null";

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon:
          freReqStatus === "completed"
            ? "account-minus"
            : freReqStatus === "null"
              ? "account-plus"
              : "account-cancel",
        title:
          freReqStatus === "completed"
            ? t("pages.detail_user.menuLabel_friend_remove")
            : freReqStatus === "null"
              ? t("pages.detail_user.menuLabel_friend_sendRequest")
              : t("pages.detail_user.menuLabel_friend_cancelRequest"),
        onPress: () => setOpenChangeFriend(true),
      },
      {
        icon: isFavorite ? "heart" : "heart-plus",
        title: isFavorite
          ? t("pages.detail_user.menuLabel_favoriteGroup_edit")
          : t("pages.detail_user.menuLabel_favoriteGroup_add"),
        onPress: () => setOpenChangeFavorite(true),
        hidden: freReqStatus !== "completed",
      },
      {
        icon: "note-edit-outline",
        title: t("pages.detail_user.menuLabel_note_edit"),
        onPress: () => setOpenChangeNote(true),
      },
      {
        type: "divider",
        hidden: freReqStatus !== "completed",
      },
      {
        icon: locationInfo?.iId
          ? "location-enter"
          : "email-receive-outline",
        title: locationInfo?.iId
          ? t("pages.detail_user.menuLabel_invite_me")
          : t("pages.detail_user.menuLabel_invite_request"),
        onPress: confirmRequestOrInvite,
        hidden: freReqStatus !== "completed",
      },
      {
        icon: "email-send-outline",
        title: isSending
          ? t("features.user.invite_sending")
          : t("pages.detail_user.menuLabel_invite_send"),
        onPress: confirmSendInvite,
        hidden: freReqStatus !== "completed",
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
        icon: "account-multiple",
        title: t("pages.detail_user_mutual_friends.label"),
        onPress: () => routeToMutualFriends(id),
        hidden: !canShowMutuals,
      },
      {
        icon: "account-group",
        title: t("pages.detail_user_mutual_groups.label"),
        onPress: () => routeToMutualGroups(id),
        hidden: !canShowMutuals,
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
    ],
    [
      canShowMutuals,
      enableJsonViewer,
      freReqStatus,
      id,
      isFavorite,
      locationInfo,
      isSending,
      confirmRequestOrInvite,
      confirmSendInvite,
      t,
      user,
    ],
  );

  useSideMenu(menuItems);

  return (
    <GenericScreen>
      {user && displayUser ? (
        <View style={{ flex: 1 }}>
          {isRefreshing && <LoadingIndicator absolute overlayOnly />}
          <CardViewUserDetail
            user={displayUser}
            onPress={() =>
              user &&
              setPreview({
                imageUrl: getUserProfilePicUrl(displayUser, true),
                open: true,
              })
            }
            onPressIcon={() =>
              user &&
              setPreview({
                imageUrl: getUserIconUrl(displayUser, true),
                open: true,
              })
            }
            style={[styles.cardView]}
          />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
              />
            }
          >
            <DetailItemContainer
              title={t("pages.detail_user.sectionLabel_location")}
            >
              {locationInfo ? (
                <TouchableEx
                  style={styles.location}
                  onPress={
                    locationInfo.wId && locationInfo.iId
                      ? () =>
                          routeToInstance(locationInfo.wId!, locationInfo.iId!)
                      : undefined
                  }
                >
                  {locationInfo?.image && (
                    <CachedImage
                      style={styles.detailItemImage}
                      src={locationInfo?.image ?? ""}
                    />
                  )}
                  <View style={styles.detailItemContent}>
                    {locationInfo?.baseInfo && (
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.colors.text }}
                      >
                        {locationInfo?.baseInfo}
                      </Text>
                    )}
                    {locationInfo?.instType && (
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.colors.text }}
                      >
                        {locationInfo?.instType}
                      </Text>
                    )}
                    {locationInfo?.capacity && (
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.colors.text }}
                      >
                        {locationInfo?.capacity}
                      </Text>
                    )}
                  </View>
                </TouchableEx>
              ) : (
                <LoadingIndicator size={30} />
              )}
            </DetailItemContainer>

            <DetailItemContainer
              title={t("pages.detail_user.sectionLabel_note")}
            >
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>{user.note}</Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer
              title={t("pages.detail_user.sectionLabel_bio")}
            >
              <View style={styles.detailItemContent}>
                {isPublicProfileError ? (
                  <TouchableEx onPress={() => void refetchPublicProfile()}>
                    <Text style={{ color: theme.colors.subText }}>
                      {t("pages.profile.profile_load_error")}
                    </Text>
                  </TouchableEx>
                ) : (
                  <Text style={{ color: theme.colors.text }}>
                    {publicProfile?.bio ?? ""}
                  </Text>
                )}
              </View>
            </DetailItemContainer>

            <DetailItemContainer
              title={t("pages.detail_user.sectionLabel_bio_links")}
            >
              <View style={styles.detailItemContent}>
                {(publicProfile?.bioLinks ?? []).map((link, index) => (
                  <LinkChip key={index} url={link} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer
              title={t("pages.detail_user.sectionLabel_badges")}
            >
              <View style={[styles.detailItemContent, styles.horizontal]}>
                {publicProfile?.badges?.map((badge) => (
                  <BadgeChip key={badge.badgeId} badge={badge} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer
              title={t("pages.detail_user.sectionLabel_info")}
            >
              <View style={styles.detailItemContent}>
                {user.last_activity && (
                  <Text style={{ color: theme.colors.text }}>
                    {t("pages.detail_user.section_info_last_activity", {
                      date: new Date(user.last_activity),
                    })}
                  </Text>
                )}
                <Text style={{ color: theme.colors.text }}>
                  {t("pages.detail_user.section_info_joined", {
                    date: new Date(user.date_joined),
                  })}
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
        onSuccess={refetch}
      />
      <ChangeFavoriteModal
        open={openChangeFavorite}
        setOpen={setOpenChangeFavorite}
        item={user}
        type="friend"
        onSuccess={refetchFavorites}
      />
      <ChangeFriendModal
        open={openChangeFriend}
        setOpen={setOpenChangeFriend}
        user={user}
        onSuccess={refetch}
      />
      <GenericDialog
        open={pendingInviteAction !== null}
        message={inviteDialogMessage}
        onConfirm={submitInviteAction}
        onCancel={() => setPendingInviteAction(null)}
        confirmTitle={t("components.confirmDialog.send")}
        cancelTitle={t("components.confirmDialog.cancel")}
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
    padding: spacing.small,
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
