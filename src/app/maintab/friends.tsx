import GenericScreen from "@/components/layout/GenericScreen";
import ListViewUser from "@/components/view/item-ListView/ListViewUser";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { routeToUser } from "@/libs/route";
import { getState, parseLocationString } from "@/libs/vrchat";
import { LimitedUserFriend, UserStatus } from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, SectionList, StyleSheet, View } from "react-native";
import { Text } from "@react-navigation/elements";
import { sortFriendWithStatus } from "@/libs/funcs/sortFriendWithStatus";

interface FriendsByState {
  online: LimitedUserFriend[];
  active: LimitedUserFriend[];
  offline: LimitedUserFriend[];
}

export default function Friends() {
  const theme = useTheme();

  const MaterialTab = createMaterialTopTabNavigator();


  // separate loading with online,active and offline friends

  const FavoriteFriendsTab = () => {
    const { friends, favorites, favoriteGroups } = useData();
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const refresh = () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      friends
        .fetch()
        .catch(console.error)
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
    }, [friends.data]);

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <SectionList
          sections={[
            { title: "Online", data: favoriteFriends.online },
            { title: "Active", data: favoriteFriends.active },
            { title: "Offline", data: favoriteFriends.offline },
          ]}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, {borderBottomColor: theme.colors.border}]}>
              <Text style={{fontWeight: "bold", color: theme.colors.text}}>{title}</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <ListViewUser
              user={item}
              style={styles.cardView}
              onPress={() => routeToUser(item.id)}
            />
          )}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      </>
    );
  };

  const OnlineFriendsTab = () => {
    const { friends } = useData();
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const refresh = () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      friends
        .fetch()
        .catch(console.error)
        .finally(() => (fetchingRef.current = false));
    };

    const onlineFriends = useMemo(() => {
      const unsorted = friends.data.filter((f) => getState(f) === "online");
      return sortFriendWithStatus(unsorted);
    }, [friends.data]);

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={onlineFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser
              user={item}
              style={styles.cardView}
              onPress={() => routeToUser(item.id)}
            />
          )}
          numColumns={1}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      </>
    );
  };

  const ActiveFriendsTab = () => {
    const { friends } = useData();
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const refresh = () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      friends
        .fetch()
        .catch(console.error)
        .finally(() => (fetchingRef.current = false));
    };

    const activeFriends = useMemo(() => {
      const unsorted = friends.data.filter((f) => getState(f) === "active");
      return sortFriendWithStatus(unsorted);
    }, [friends.data]);

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={activeFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser
              user={item}
              style={styles.cardView}
              onPress={() => routeToUser(item.id)}
            />
          )}
          numColumns={1}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      </>
    );
  };

  const OfflineFriendsTab = () => {
    const { friends } = useData();
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const refresh = () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      friends
        .fetch()
        .catch(console.error)
        .finally(() => (fetchingRef.current = false));
    };

    const offlineFriends = useMemo(() => {
      const unsorted = friends.data.filter((f) => getState(f) === "offline");
      return sortFriendWithStatus(unsorted);
    }, [friends.data]);

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={offlineFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser
              user={item}
              style={styles.cardView}
              onPress={() => routeToUser(item.id)}
            />
          )}
          numColumns={1}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      </>
    );
  };
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
          options={{ tabBarLabel: "Favorite" }}
          component={useCallback(FavoriteFriendsTab, [])}
        />
        <MaterialTab.Screen
          name="online"
          options={{ tabBarLabel: "Online" }}
          component={useCallback(OnlineFriendsTab, [])}
        />
        <MaterialTab.Screen
          name="active"
          options={{ tabBarLabel: "Active" }}
          component={useCallback(ActiveFriendsTab, [])}
        />
        <MaterialTab.Screen
          name="offline"
          options={{ tabBarLabel: "Offline" }}
          component={useCallback(OfflineFriendsTab, [])}
        />
      </MaterialTab.Navigator>
    </GenericScreen>
  );
}

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
