import GenericScreen from "@/components/layout/GenericScreen";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import CardViewUser from "@/components/view/item-CardView/CardViewUser";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { spacing } from "@/config/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { routeToAvatar, routeToUser, routeToWorld } from "@/lib/route";
import {
  Avatar,
  FavoritedWorld,
  FavoriteGroup,
  LimitedUserFriend,
  User,
  World,
} from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function Favorites() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { favoriteGroups } = useData();

  const MaterialTab = createMaterialTopTabNavigator();

  const favoriteGroupsMap = useMemo(
    () => ({
      worlds: favoriteGroups.data
        .filter((group) => group.type === "world")
        .sort((a, b) => a.name.localeCompare(b.name)),
      friends: favoriteGroups.data
        .filter((group) => group.type === "friend")
        .sort((a, b) => a.name.localeCompare(b.name)),
      avatars: favoriteGroups.data
        .filter((group) => group.type === "avatar")
        .sort((a, b) => a.name.localeCompare(b.name)),
    }),
    [favoriteGroups.data]
  );

  const WorldsTab = () => {
    const { worlds: worldsData, favorites } = useData();
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(
      null
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const worlds = useMemo(() => {
      if (!selectedGroup) return [];
      const favWorldMap = new Map(
        favorites.data
          .filter(
            (fvrt) =>
              fvrt.type === "world" && fvrt.tags.includes(selectedGroup.name)
          )
          .map((fvrt) => [fvrt.favoriteId, true])
      );
      return worldsData.data.filter((w) => favWorldMap.has(w.id));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worldsData.data, selectedGroup]);

    useEffect(() => {
      setSelectedGroup(favoriteGroupsMap.worlds[0] || null);
    }, [favoriteGroupsMap.worlds]);

    const refresh = () => {
      setIsLoading(true);
      worldsData
        .fetch()
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };

    return (
      <View style={{ flex: 1 }}>
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
          />
        ) : (
          <Text>No Favorite Group Selected</Text>
        )}
      </View>
    );
  };
  const FriendsTab = () => {
    const { friends: friendsData, favorites } = useData();
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(
      null
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const friends = useMemo(() => {
      if (!selectedGroup) return [];
      const favFriendMap = new Map(
        favorites.data
          .filter(
            (fvrt) =>
              fvrt.type === "friend" && fvrt.tags.includes(selectedGroup.name)
          )
          .map((fvrt) => [fvrt.favoriteId, true])
      );
      return friendsData.data.filter((f) => favFriendMap.has(f.id));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendsData.data, selectedGroup]);

    useEffect(() => {
      setSelectedGroup(favoriteGroupsMap.friends[0] || null);
    }, [favoriteGroupsMap.friends]);

    const refresh = () => {
      setIsLoading(true);
      friendsData
        .fetch()
        .catch(console.error)
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
          />
        ) : (
          <Text>No Favorite Group Selected</Text>
        )}
      </View>
    );
  };
  const AvatarsTab = () => {
    const { avatars: avatarsData, favorites } = useData();
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(
      null
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const avatars = useMemo(() => {
      if (!selectedGroup) return [];
      const favAvatarMap = new Map(
        favorites.data
          .filter(
            (fvrt) =>
              fvrt.type === "avatar" && fvrt.tags.includes(selectedGroup.name)
          )
          .map((fvrt) => [fvrt.favoriteId, true])
      );
      return avatarsData.data.filter((a) => favAvatarMap.has(a.id));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [avatarsData.data, selectedGroup]);

    useEffect(() => {
      setSelectedGroup(favoriteGroupsMap.avatars[0] || null);
    }, [favoriteGroupsMap.avatars]);

    const refresh = () => {
      setIsLoading(true);
      avatarsData
        .fetch()
        .catch(console.error)
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
          />
        ) : (
          <Text>No Favorite Group Selected</Text>
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
          options={{ tabBarLabel: "Worlds" }}
          component={WorldsTab}
        />
        <MaterialTab.Screen
          name="friends"
          options={{ tabBarLabel: "Friends" }}
          component={FriendsTab}
        />
        <MaterialTab.Screen
          name="avatars"
          options={{ tabBarLabel: "Avatars" }}
          component={AvatarsTab}
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
});
