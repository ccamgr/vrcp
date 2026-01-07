import GenericScreen from "@/components/layout/GenericScreen";
import ListViewUser from "@/components/view/item-ListView/ListViewUser";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { routeToUser } from "@/libs/route";
import { getState, parseLocationString } from "@/libs/vrchat";
import { LimitedUserFriend, UserStatus } from "@/generated/vrcapi";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, SectionList, StyleSheet, View } from "react-native";
import { Text } from "@react-navigation/elements";
import { sortFriendWithStatus } from "@/libs/funcs/sortFriendWithStatus";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";

interface FriendsByState {
  online: LimitedUserFriend[];
  active: LimitedUserFriend[];
  offline: LimitedUserFriend[];
}

export default function Friends() {
  const theme = useTheme();
  const { t } = useTranslation ();
  const MaterialTab = createMaterialTopTabNavigator();

  // separate loading with online,active and offline friend
  return (
    <GenericScreen>
      <MaterialTab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: theme.colors.background },
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
        }}
      >
        <MaterialTab.Screen
          name="favorite"
          options={{ tabBarLabel: t("pages.friends.tabLabel_favorites") }}
          component={FavoriteFriendsTab}
        />
        <MaterialTab.Screen
          name="online"
          options={{ tabBarLabel: t("pages.friends.tabLabel_online") }}
        >
          {() => <StateFriendsTab filterState="online" />}
        </MaterialTab.Screen>
        <MaterialTab.Screen
          name="active"
          options={{ tabBarLabel: t("pages.friends.tabLabel_active") }}
        >
          {() => <StateFriendsTab filterState="active" />}
        </MaterialTab.Screen>
        <MaterialTab.Screen
          name="offline"
          options={{ tabBarLabel: t("pages.friends.tabLabel_offline") }}
        >
          {() => <StateFriendsTab filterState="offline" />}
        </MaterialTab.Screen>
      </MaterialTab.Navigator>
    </GenericScreen>
  );
};


const FavoriteFriendsTab = memo(() => {
  const theme = useTheme();
  const { t } = useTranslation ();
  const { showToast } = useToast();
  const { friends, favorites, favoriteGroups } = useData();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const refresh = () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    friends
      .fetch()
      .catch((e) => showToast("error", "Error refreshing friends", extractErrMsg(e)))
      .finally(() => (fetchingRef.current = false));
  };

  const friFavSet = useMemo<Map<string, string>>(() => {
    const friFavs = favorites.data.filter((ff) => ff.type === "friend");
    return new Map(friFavs.map((ff) => [ff.favoriteId, ff.tags.length ? ff.tags[0] : ""]));
  }, [favorites.data]);

  const favoriteFriends = useMemo(() => {
    const favFriends = friends.data.filter((f) => friFavSet.has(f.id));
    const devided : FriendsByState = { online: [], active: [], offline: []};
    favFriends.forEach(f => {
      const state = getState(f);
      if(state === "online") devided.online.push(f);
      else if(state === "active") devided.active.push(f);
      else devided.offline.push(f);
    });


    const sorted: FriendsByState = {
      online: sortFriendWithStatus(devided.online),
      active: sortFriendWithStatus(devided.active),
      offline: sortFriendWithStatus(devided.offline),
    };

    return sorted;
  }, [friends.data, friFavSet]);

  const renderItem = useCallback(({ item, index }: { item: LimitedUserFriend, index: number }) => (
    <ListViewUser
      user={item}
      style={styles.cardView}
      onPress={() => routeToUser(item.id)}
    />
  ), []);

  const renderSecHeader = useCallback(({ section: { title } }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, {borderBottomColor: theme.colors.border}]}>
      <Text style={{fontWeight: "bold", color: theme.colors.text}}>{title}</Text>
    </View>
  ), [theme.colors.border, theme.colors.text]);

  const sections = useMemo(() => [
    { title: t("pages.friends.tabLabel_online"), data: favoriteFriends.online },
    { title: t("pages.friends.tabLabel_active"), data: favoriteFriends.active },
    { title: t("pages.friends.tabLabel_offline"), data: favoriteFriends.offline },
  ], [favoriteFriends, t]);

  return (
    <>
      {isLoading && <LoadingIndicator absolute />}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={renderSecHeader}
        renderItem={renderItem}
        refreshing={isLoading}
        onRefresh={refresh}
      />
    </>
  );
});

const StateFriendsTab = memo(({filterState}: {filterState: "online" | "active" | "offline"}) => {
  const { friends } = useData();
  const { showToast } = useToast();
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const refresh = () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    friends
      .fetch()
      .catch((e) => showToast("error", "Error refreshing friends", extractErrMsg(e)))
      .finally(() => (fetchingRef.current = false));
  };

  const onlineFriends = useMemo(() => {
    const unsorted = friends.data.filter((f) => getState(f) === filterState);
    return sortFriendWithStatus(unsorted);
  }, [friends.data, filterState]);


  const renderItem = useCallback(({ item, index }: { item: LimitedUserFriend, index: number }) => (
    <ListViewUser
      user={item}
      style={styles.cardView}
      onPress={() => routeToUser(item.id)}
    />
  ), []);

  return (
    <>
      {isLoading && <LoadingIndicator absolute />}
      <FlatList
        data={onlineFriends}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={1}
        refreshing={isLoading}
        onRefresh={refresh}
      />
    </>
  );
});


const styles = StyleSheet.create({
  sectionHeader: {
    paddingTop: spacing.medium,
    marginBottom: spacing.small,
    borderBottomWidth: 1,
  },
  cardView: {
    padding: spacing.small,
    width: "100%",
  },
  withDevider: {
    marginTop: spacing.medium,
    paddingTop: spacing.large,
    borderTopWidth: 1,
  },
  selectGroupButton: {
    padding: spacing.small,
    marginTop: spacing.medium,
  },
});
