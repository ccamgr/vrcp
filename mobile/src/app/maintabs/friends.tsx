import GenericScreen from "@/components/layout/GenericScreen";
import ListViewUser from "@/components/view/item-ListView/ListViewUser";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { extractErrMsg } from "@/lib/utils";
import { routeToFriendSearch, routeToUser } from "@/lib/route";
import { getState } from "@/lib/vrchat";
import { LimitedUserFriend } from "@/generated/vrcapi";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { memo, useCallback, useMemo } from "react";
import { FlatList, SectionList, StyleSheet, View } from "react-native";
import { Text } from "@react-navigation/elements";
import { sortFriendWithStatus } from "@/lib/funcs/sortFriendWithStatus";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { useFavFriends } from "@/hooks/vrc/useFavFriends";
import { useFriends } from "@/hooks/vrc/useFriends";
import { MenuItem } from "@/components/layout/type";
import { useSideMenu } from "@/contexts/AppMenuContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface FriendsByState {
  online: LimitedUserFriend[];
  active: LimitedUserFriend[];
  offline: LimitedUserFriend[];
}

export default function Friends() {
  const theme = useTheme();
  const { t } = useTranslation();
  const MaterialTab = createMaterialTopTabNavigator();
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        icon: "search",
        title: t("pages.friends.menuLabel_search"),
        onPress: routeToFriendSearch,
      },
    ],
    [t],
  );

  useSideMenu(menuItems);

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
}

const FavoriteFriendsTab = memo(function FavoriteFriendsTab() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: favFriends, refetch, isLoading } = useFavFriends();
  const { isRefreshing, onRefresh } = usePullToRefresh(refetch, (error) =>
    showToast("error", "Error refreshing friends", extractErrMsg(error)),
  );

  const favoriteFriends = useMemo(() => {
    const devided: FriendsByState = { online: [], active: [], offline: [] };
    (favFriends ?? []).forEach((f) => {
      const state = getState(f);
      if (state === "online") devided.online.push(f);
      else if (state === "active") devided.active.push(f);
      else devided.offline.push(f);
    });

    const sorted: FriendsByState = {
      online: sortFriendWithStatus(devided.online),
      active: sortFriendWithStatus(devided.active),
      offline: sortFriendWithStatus(devided.offline),
    };

    return sorted;
  }, [favFriends]);

  const renderItem = useCallback(
    ({ item, index }: { item: LimitedUserFriend; index: number }) => (
      <ListViewUser
        user={item}
        style={styles.cardView}
        onPress={() => routeToUser(item.id)}
      />
    ),
    [],
  );

  const renderSecHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <View
        style={[
          styles.sectionHeader,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Text style={{ fontWeight: "bold", color: theme.colors.text }}>
          {title}
        </Text>
      </View>
    ),
    [theme.colors.border, theme.colors.text],
  );

  const sections = useMemo(
    () => [
      {
        title: t("pages.friends.tabLabel_online"),
        data: favoriteFriends.online,
      },
      {
        title: t("pages.friends.tabLabel_active"),
        data: favoriteFriends.active,
      },
      {
        title: t("pages.friends.tabLabel_offline"),
        data: favoriteFriends.offline,
      },
    ],
    [favoriteFriends, t],
  );

  return (
    <>
      {isLoading && <LoadingIndicator absolute />}
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={renderSecHeader}
        renderItem={renderItem}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    </>
  );
});

const StateFriendsTab = memo(function StateFriendsTab({
  filterState,
}: {
  filterState: "online" | "active" | "offline";
}) {
  const { data: friends, refetch, isLoading } = useFriends();
  const { showToast } = useToast();
  const { isRefreshing, onRefresh } = usePullToRefresh(refetch, (error) =>
    showToast("error", "Error refreshing friends", extractErrMsg(error)),
  );

  const onlineFriends = useMemo(() => {
    const unsorted = friends?.filter((f) => getState(f) === filterState);
    return sortFriendWithStatus(unsorted ?? []);
  }, [friends, filterState]);

  const renderItem = useCallback(
    ({ item, index }: { item: LimitedUserFriend; index: number }) => (
      <ListViewUser
        user={item}
        style={styles.cardView}
        onPress={() => routeToUser(item.id)}
      />
    ),
    [],
  );

  return (
    <>
      {isLoading && <LoadingIndicator absolute />}
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <FlatList
        data={onlineFriends}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={1}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
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
