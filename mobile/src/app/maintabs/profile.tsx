import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import BadgeChip from "@/components/view/chip-badge/BadgeChip";
import LinkChip from "@/components/view/chip-badge/LinkChip";
import RegionBadge from "@/components/view/chip-badge/RegionBadge";
import CardViewUserDetail from "@/components/view/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ImagePreview from "@/components/view/ImagePreview";
import { getUserIconUrl, getUserProfilePicUrl } from "@/lib/vrchat";
import ChangeStatusModal from "@/components/modals/ChangeStatusModal";
import { MenuItem } from "@/components/layout/type";
import ChangeBioModal from "@/components/modals/ChangeBioModal";
import ChangeBioLinksModal from "@/components/modals/ChangeBioLinksModal";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { routeToAvatar, routeToFavorites, routeToAvatars, routeToGroups, routeToPrints, routeToWorlds} from "@/lib/route";
import { useTranslation } from "react-i18next";
import { useSideMenu } from "@/contexts/AppMenuContext";

export default function Profile() {
  const vrc = useVRChat();
  const { t } = useTranslation();
  const theme = useTheme();
  const { currentUser } = useData();
  const [preview, setPreview] = useState({ imageUrl: "", open: false });
  const [openJson, setOpenJson] = useState(false);
  const [openChangeStatus, setOpenChangeStatus] = useState(false);
  const [openChangeBio, setOpenChangeBio] = useState(false);
  const [openChangeBioLinks, setOpenChangeBioLinks] = useState(false);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: "playlist-edit",
      title: t("pages.profile.menuLabel_edit_bio"),
      onPress: () => setOpenChangeBio(true),
    },
    {
      icon: "circle-edit-outline",
      // icon: "clipboard-edit-outline",
      title: t("pages.profile.menuLabel_edit_bio_links"),
      onPress: () => setOpenChangeBioLinks(true),
    },
    {
      icon: "human-edit",
      title: t("pages.profile.menuLabel_change_status"),
      onPress: () => setOpenChangeStatus(true),
    },
    {
      type: "divider",
    },
    {
      icon: "human",
      title: t("pages.profile.menuLabel_route_avatars"),
      onPress: () => routeToAvatars(),
    },
    {
      icon: "forest",
      title: t("pages.profile.menuLabel_route_worlds"),
      onPress: () => routeToWorlds(),

    },
    {
      icon: "diversity-3",
      title: t("pages.profile.menuLabel_route_groups"),
      onPress: () => routeToGroups(),
    },
    {
      icon: "panorama",
      title: t("pages.profile.menuLabel_route_prints"),
      onPress: () => routeToPrints(),
    },
    {
      type: "divider"
    },
    {
      icon: "star",
      title: t("pages.profile.menuLabel_route_favorites"),
      onPress: () => routeToFavorites(),
    },
    {
      icon: "hanger",
      title: t("pages.profile.menuLabel_route_current_avatar"),
      onPress: () => currentUser.data?.currentAvatar && routeToAvatar(currentUser.data.currentAvatar),
    },
    {
      type: "divider"
    },
    {
      icon: "code-json",
      title: t("pages.profile.menuLabel_json"),
      onPress: () => setOpenJson(true),
    },
  ], [t, currentUser.data]);

  useSideMenu(menuItems);

  return (
    <GenericScreen >
      {currentUser.data ? (
        <View style={{ height: "100%" }}>
          <CardViewUserDetail
            user={currentUser.data}
            style={[styles.cardView]}
            onPress={() => currentUser.data && setPreview({imageUrl: getUserProfilePicUrl(currentUser.data, true), open: true})}
            onPressIcon={() => currentUser.data && setPreview({imageUrl: getUserIconUrl(currentUser.data, true), open: true})}
          />

          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={currentUser.isLoading}
                onRefresh={currentUser.fetch}
              />
            }
          >

            <DetailItemContainer title={t("pages.profile.sectionLabel_bio")}>
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {currentUser.data.bio}
                </Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.profile.sectionLabel_bio_links")}>
              <View style={styles.detailItemContent}>
                {currentUser.data.bioLinks.map((link, index) => (
                  <LinkChip key={index} url={link} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.profile.sectionLabel_badges")}>
              <View style={[styles.detailItemContent, styles.horizontal]}>
                {currentUser.data.badges?.map((badge) => (
                  <BadgeChip key={badge.badgeId} badge={badge} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.profile.sectionLabel_info")}>
              <View style={styles.detailItemContent}>
                { currentUser.data.last_activity && (
                  <Text style={{ color: theme.colors.text }}>
                    {`${t("pages.profile.section_info_last_activity", {date: new Date(currentUser.data.last_activity)})}`}
                  </Text>
                )}
                <Text style={{ color: theme.colors.text }}>
                  {`${t("pages.profile.section_info_joined", {date: new Date(currentUser.data.date_joined)})}`}
                </Text>
              </View>
            </DetailItemContainer>

          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      {/* dialog and modals */}
      <JsonDataModal open={openJson} setOpen={setOpenJson} data={currentUser.data} />
      <ImagePreview
        imageUrls={[preview.imageUrl]}
        open={preview.open}
        onClose={() => setPreview({ imageUrl: "", open: false })}
      />
      <ChangeStatusModal open={openChangeStatus} setOpen={setOpenChangeStatus} />
      <ChangeBioModal open={openChangeBio} setOpen={setOpenChangeBio} />
      <ChangeBioLinksModal open={openChangeBioLinks} setOpen={setOpenChangeBioLinks} />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cardView: {
    position: "relative",
    paddingVertical: spacing.medium,
    // pointerEvents: "none", // override TouchableOpacity events
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
  horizontal: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
});
