import GenericScreen from "@/components/layout/GenericScreen";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import CardViewUser from "@/components/view/item-CardView/CardViewUser";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/utils";
import { routeToAvatar, routeToUser, routeToWorld } from "@/lib/route";
import {
  Avatar,
  FavoritedWorld,
  FavoriteGroup,
  LimitedUserFriend,
  User,
  World,
} from "@/generated/vrcapi";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { useFavoriteGroups } from "@/hooks/vrc/useFavoriteGroups";
import { useFavWorlds } from "@/hooks/vrc/useFavWorlds";
import { useFavorites } from "@/hooks/vrc/useFavorites";
import { useFriends } from "@/hooks/vrc/useFriends";
import { useFavAvatars } from "@/hooks/vrc/useFavAvatars";
import { useFavFriends } from "@/hooks/vrc/useFavFriends";

export default function Favorites() {
  const vrc = useVRChat();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const { data: favoriteGroups } = useFavoriteGroups();

  const MaterialTab = createMaterialTopTabNavigator();

  const favoriteGroupsMap = useMemo(
    () => ({
      worlds: favoriteGroups
        ?.filter((group) => group.type === "world")
        ?.sort((a, b) => a.name.localeCompare(b.name)) || [],
      friends: favoriteGroups
        ?.filter((group) => group.type === "friend")
        ?.sort((a, b) => a.name.localeCompare(b.name)) || [],
      avatars: favoriteGroups
        ?.filter((group) => group.type === "avatar")
        ?.sort((a, b) => a.name.localeCompare(b.name)) || [],
    }),
    [favoriteGroups]
  );

  const WorldsTab = () => {
    const { data: favorites } = useFavorites();
    const { data: favWorlds, refetch } = useFavWorlds();
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(
      null
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const favWorldMap = useMemo(
      () => new Map(favorites?.filter((fvrt) => selectedGroup &&
        fvrt.type === "world" &&
        fvrt.tags.includes(selectedGroup.name)
      )
        ?.map((fvrt) => [fvrt.favoriteId, true])
      ), [selectedGroup, favorites]
    );

    const worlds = useMemo(() => favWorlds?.filter(
      (w) => favWorldMap.has(w.id)
    ), [favWorlds, favWorldMap]);

    useEffect(() => {
      setSelectedGroup(favoriteGroupsMap.worlds[0] || null);
    }, [favoriteGroupsMap.worlds]);

    const refresh = () => {
      setIsLoading(true);
      refetch()
        .catch((e) => showToast("error", "Error refreshing favorite worlds", extractErrMsg(e)))
        .finally(() => setIsLoading(false));
    };

    return (
      <GenericScreen>
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={favoriteGroupsMap.worlds}
          value={selectedGroup}
          onChange={setSelectedGroup}
          nameExtractor={(item) =>
            item.displayName.length > 0 ? item.displayName : undefined
          }
        />
        {isLoading && <LoadingIndicator absolute />}
        {selectedGroup ? (
          <FlatList
            data={worlds}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardViewWorld
                world={item}
                style={styles.cardView}
                onPress={() => routeToWorld(item.id)}
              />
            )}
            numColumns={2}
            refreshing={isLoading}
            onRefresh={refresh}
            contentContainerStyle={styles.scrollContentContainer}
          />
        ) : (
          <Text>{t("pages.favorites.no_favoritegroup_selected")}</Text>
        )}
      </GenericScreen>
    );
  };
  const FriendsTab = () => {
    const { data: favorites } = useFavorites();
    const { data: favFriends, refetch } = useFavFriends();
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(
      null
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);


    const favFriendMap = useMemo(
      () => new Map(favorites?.filter((fvrt) => selectedGroup &&
        fvrt.type === "friend" &&
        fvrt.tags.includes(selectedGroup.name)
      )
        .map((fvrt) => [fvrt.favoriteId, true])
      ), [selectedGroup, favorites]
    );

    const friends = useMemo(() => favFriends?.filter(
      (f) => favFriendMap.has(f.id)
    ), [favFriends, favFriendMap]);

    useEffect(() => {
      setSelectedGroup(favoriteGroupsMap.friends[0] || null);
    }, [favoriteGroupsMap.friends]);

    const refresh = () => {
      setIsLoading(true);
      refetch()
        .catch((e) => showToast("error", "Error refreshing favorite friends", extractErrMsg(e)))
        .finally(() => setIsLoading(false));
    };

    return (
      <View style={{ flex: 1 }}>
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={favoriteGroupsMap.friends}
          value={selectedGroup}
          onChange={setSelectedGroup}
          nameExtractor={(item) =>
            item.displayName.length > 0 ? item.displayName : undefined
          }
        />
        {isLoading && <LoadingIndicator absolute />}
        {selectedGroup ? (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardViewUser
                user={item}
                style={styles.cardView}
                onPress={() => routeToUser(item.id)}
              />
            )}
            numColumns={2}
            onRefresh={refresh}
            refreshing={isLoading}
            contentContainerStyle={styles.scrollContentContainer}
          />
        ) : (
          <Text>{t("pages.favorites.no_favoritegroup_selected")}</Text>
        )}
      </View>
    );
  };
  const AvatarsTab = () => {
    const { data: favorites } = useFavorites();
    const { data: favAvatars, refetch } = useFavAvatars();
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(
      null
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);


    const favAvatarMap = useMemo(
      () => new Map(favorites?.filter((fvrt) => selectedGroup &&
        fvrt.type === "avatar" &&
        fvrt.tags.includes(selectedGroup.name)
      )
        .map((fvrt) => [fvrt.favoriteId, true])
      ), [selectedGroup, favorites]
    );

    const avatars = useMemo(() => favAvatars?.filter(
      (a) => favAvatarMap.has(a.id)
    ), [favAvatars, favAvatarMap]);

    useEffect(() => {
      setSelectedGroup(favoriteGroupsMap.avatars[0] || null);
    }, [favoriteGroupsMap.avatars]);

    const refresh = () => {
      setIsLoading(true);
      refetch()
        .catch((e) => showToast("error", "Error refreshing favorite avatars", extractErrMsg(e)))
        .finally(() => setIsLoading(false));
    };

    return (
      <View style={{ flex: 1 }}>
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={favoriteGroupsMap.avatars}
          value={selectedGroup}
          onChange={setSelectedGroup}
          nameExtractor={(item) =>
            item.displayName.length > 0 ? item.displayName : undefined
          }
        />
        {isLoading && <LoadingIndicator absolute />}
        {selectedGroup ? (
          <FlatList
            data={avatars}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardViewAvatar
                avatar={item}
                style={styles.cardView}
                onPress={() => routeToAvatar(item.id)}
              />
            )}
            numColumns={2}
            refreshing={isLoading}
            onRefresh={refresh}
            contentContainerStyle={styles.scrollContentContainer}
          />
        ) : (
          <Text>{t("pages.favorites.no_favoritegroup_selected")}</Text>
        )}
      </View>
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
          name="worlds"
          options={{ tabBarLabel: t("pages.favorites.tabLabel_worlds") }}
          component={useCallback(WorldsTab, [favoriteGroupsMap.worlds])}
        />
        <MaterialTab.Screen
          name="friends"
          options={{ tabBarLabel: t("pages.favorites.tabLabel_friends") }}
          component={useCallback(FriendsTab, [favoriteGroupsMap.friends])}
        />
        <MaterialTab.Screen
          name="avatars"
          options={{ tabBarLabel: t("pages.favorites.tabLabel_avatars") }}
          component={useCallback(AvatarsTab, [favoriteGroupsMap.avatars])}
        />
      </MaterialTab.Navigator>
    </GenericScreen>
  );
}
const styles = StyleSheet.create({
  cardView: {
    padding: spacing.small,
    width: "50%",
  },
  selectGroupButton: {
    padding: spacing.small,
    marginTop: spacing.medium,
  },
  scrollContentContainer: {
    paddingBottom: navigationBarHeight,
  },
});
