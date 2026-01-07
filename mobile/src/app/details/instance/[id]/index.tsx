import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/features/DetailItemContainer";
import PlatformChips from "@/components/view/chip-badge/PlatformChips";
import TagChips from "@/components/view/chip-badge/TagChips";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import CardViewInstanceDetail from "@/components/view/item-CardView/detail/CardViewInstanceDetail";
import CardViewWorldDetail from "@/components/view/item-CardView/detail/CardViewWorldDetail";
import ListViewInstance from "@/components/view/item-ListView/ListViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { CachedImage, useCache } from "@/contexts/CacheContext";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import {
  getAuthorTags,
  getTrustRankColor,
  getPlatform,
  parseLocationString,
  UserLike,
  GroupLike,
} from "@/libs/vrchat";
import { Instance, LimitedUserFriend, LimitedUserInstance, World } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { routeToGroup, routeToSearch, routeToUser, routeToWorld } from "@/libs/route";
import IconSymbol from "@/components/view/icon-components/IconView";
import { RefreshControl } from "react-native-gesture-handler";
import { MenuItem } from "@/components/layout/type";
import JsonDataModal from "@/components/modals/JsonDataModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { TouchableEx } from "@/components/CustomElements";
import { t } from "i18next";
import { useSetting } from "@/contexts/SettingContext";
import { useSideMenu } from "@/contexts/AppMenuContext";

type Owner =
  | { type: "user"; owner: UserLike }
  | { type: "group"; owner: GroupLike };

export default function InstanceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); // must be locationStr (e.g. wrld_xxx:00000~region(jp))
  const { parsedLocation } = parseLocationString(id);
  const enableJsonViewer = useSetting().settings.otherOptions_enableJsonViewer;
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { friends: allFriends } = useData();
  const cache = useCache();
  const theme = useTheme();
  const [instance, setInstance] = useState<Instance>();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);

  const [owner, setOwner] = useState<Owner>();
  const [friends, setFriends] = useState<(LimitedUserFriend | LimitedUserInstance)[]>([]);

  const [openJson, setOpenJson] = useState(false);

  const fetchInstance = () => {
    // instance isnot cached
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    vrc.instancesApi.getInstance({
      worldId: parsedLocation?.worldId ?? "",
      instanceId: parsedLocation?.instanceId ?? "",
    })
      .then((res) => setInstance(res.data))
      .catch((e) => showToast("error", "Error fetching instance data", extractErrMsg(e)))
      .finally(() => fetchingRef.current = false);
  };

  useEffect(() => {
    fetchInstance();
  }, []);

  useEffect(() => {
    if (!instance) return;
    let foundOwner = false;
    const friendList: (LimitedUserFriend | LimitedUserInstance)[] = [];
    const location = `${instance.worldId}:${instance.instanceId}`;
    allFriends.data.forEach((f) => {
      if (f.location === location) friendList.push(f);
      if (f.id === instance.ownerId) {
        foundOwner = true;
        setOwner({ type: "user", owner: f }); // if owner is friend, set owner data
      }
    });
    setFriends(friendList);
    if (!foundOwner && instance.ownerId) {
      // not found in friends, fetch owner data
      if (instance.ownerId.startsWith("usr_")) {
        cache.user.get(instance.ownerId).then((owner) => setOwner({ type: "user", owner })).catch((e) => {
          showToast("error", "Error fetching owner profile", extractErrMsg(e));
        });
      } else if (instance.ownerId.startsWith("grp_")) {
        cache.group.get(instance.ownerId).then((owner) => setOwner({ type: "group", owner })).catch((e) => {
          showToast("error", "Error fetching owner group", extractErrMsg(e));
        });
      }
    }
  }, [instance, instance?.users, instance?.ownerId]);


  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: "circle-medium",
      title: "INVITE ME or REQUEST INVITE"
      // onPress: () => {},
    },
    {
      type: "divider",
      hidden: !enableJsonViewer,
    },
    {
      icon: "code-json",
      title: t("pages.detail_instance.menuLabel_json"),
      onPress: () => setOpenJson(true),
      hidden: !enableJsonViewer,
    },
  ], [enableJsonViewer, t]);
  useSideMenu(menuItems);

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
            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_usersInInstance")}>
              <View style={styles.detailItemContent}>
                {/* {chunkArray(friends, 2).map((chunk, index) => (
                  <View style={{ flexDirection: "row" }} key={`friend-chunk-${index}`}>
                    {chunk.map((friend) => (
                      <TouchableOpacity style={styles.user} key={friend.id} onPress={() => routeToUser(friend.id)}>
                        <UserOrGroupChip data={friend} textColor={getTrustRankColor(friend, true, false)} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ))} */}
                {friends.map((friend) => (
                  <TouchableEx style={styles.user} key={friend.id} onPress={() => routeToUser(friend.id)}>
                    <UserOrGroupChip data={friend} textColor={getTrustRankColor(friend, true, false)} />
                  </TouchableEx>
                ))}
                {instance.n_users > friends.length && (
                  <Text style={[styles.moreUser, { color: theme.colors.text }]}>{t("pages.detail_instance.section_users_more_user_count_other", { count: instance.n_users - friends.length })}</Text>
                )}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_world")}>
              <View style={styles.detailItemContent}>
                <TouchableEx style={styles.horizontal} onPress={() => routeToWorld(instance.worldId)}>
                  <CachedImage src={instance.world.thumbnailImageUrl} style={[styles.worldImage, { borderColor: theme.colors.subText }]} />
                  <Text style={[styles.worldName, { color: theme.colors.text }]}>
                    {instance.world.name}
                  </Text>
                </TouchableEx>
              </View>
            </DetailItemContainer>

            {owner && (
              <DetailItemContainer title={t("pages.detail_instance.sectionLabel_owner")}>
                <View style={[styles.detailItemContent]}>
                  {owner.type === "user" ? (
                    <TouchableEx onPress={() => routeToUser(owner.owner.id)}>
                      <UserOrGroupChip data={owner.owner} icon="crown" textColor={getTrustRankColor(owner.owner, true, false)} />
                    </TouchableEx>
                  ) : (
                    <TouchableEx onPress={() => owner.owner.id && routeToGroup(owner.owner.id)}>
                      <UserOrGroupChip data={owner.owner} icon="crown" />
                    </TouchableEx>
                  )}
                </View>
              </DetailItemContainer>
            )}

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


            <DetailItemContainer title={t("pages.detail_instance.sectionLabel_info")}>
              <View style={styles.detailItemContent}>
                <Text
                  style={{ color: theme.colors.text }}
                >{t("pages.detail_instance.section_info_capacity", { capacity: instance.capacity })}</Text>
                <Text
                  style={{ color: theme.colors.text }}
                >{t("pages.detail_instance.section_info_ageGated", { ageGated: instance.ageGate })}</Text>
              </View>
            </DetailItemContainer>

          </ScrollView>

        </View>
      ) : (
        <LoadingIndicator absolute />
      )}

      {/* Modals */}
      <JsonDataModal open={openJson} setOpen={setOpenJson} data={instance} />
    </GenericScreen>
  );
}


const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
};

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
  listWorld: {

  },
  user: {
    // width: "50%",
    width: "100%",
    // borderStyle:"dotted", borderColor:"blue",borderWidth:1
  },
  moreUser: {
    alignSelf: "flex-end",
    marginRight: spacing.medium,
  },

  detailItemContent: {
    flex: 1,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
  worldImage: {
    marginRight: spacing.small,
    height: spacing.small * 2 + fontSize.medium * 3,
    aspectRatio: 16 / 9,
    borderRadius: radius.small,
    borderStyle: "solid",
    borderWidth: 1
  },
  worldName: {
    fontSize: fontSize.medium,
  }
});
