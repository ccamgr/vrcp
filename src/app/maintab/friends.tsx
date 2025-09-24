import GenericScreen from "@/components/layout/GenericScreen";
import ListViewUser from "@/components/view/item-ListView/ListViewUser";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/config/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { routeToUser } from "@/lib/route";
import { getState } from "@/lib/vrchatUtils";
import { LimitedUserFriend } from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet } from "react-native";

export default function Friends() {
  const theme = useTheme();

  const MaterialTab = createMaterialTopTabNavigator();

  // separate loading with online,active and offline friends

  const FavoriteFriendsTab = () => {
    const { friends, favorites, favoriteGroups } = useData();
    const [isLoading, setIsLoading] = useState(false);
    const refresh = () => {
      setIsLoading(true);
      friends
        .fetch()
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };

    const favoriteFriends = useMemo(() => {
      const friFavs = favorites.data.filter((ff) => ff.type === "friend");
      const friFavSet = new Set(friFavs.map((ff) => ff.favoriteId));
      return friends.data.filter((f) => friFavSet.has(f.id));
    }, [friends.data, favorites.data, favoriteGroups.data]);

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={favoriteFriends}
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

  const OnlineFriendsTab = () => {
    const { friends } = useData();
    const [isLoading, setIsLoading] = useState(false);
    const refresh = () => {
      setIsLoading(true);
      friends
        .fetch()
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };
    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={friends.data.filter((f) => getState(f) === "online")}
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
    const [isLoading, setIsLoading] = useState(false);
    const refresh = () => {
      setIsLoading(true);
      friends
        .fetch()
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };
    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={friends.data.filter((f) => getState(f) === "active")}
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
    const [isLoading, setIsLoading] = useState(false);
    const refresh = () => {
      setIsLoading(true);
      friends
        .fetch()
        .catch(console.error)
        .finally(() => setIsLoading(false));
    };
    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={friends.data.filter((f) => getState(f) === "offline")}
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
          component={FavoriteFriendsTab}
        />
        <MaterialTab.Screen
          name="online"
          options={{ tabBarLabel: "Online" }}
          component={OnlineFriendsTab}
        />
        <MaterialTab.Screen
          name="active"
          options={{ tabBarLabel: "Active" }}
          component={ActiveFriendsTab}
        />
        <MaterialTab.Screen
          name="offline"
          options={{ tabBarLabel: "Offline" }}
          component={OfflineFriendsTab}
        />
      </MaterialTab.Navigator>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cardView: {
    padding: spacing.small,
    width: "100%",
  },
  selectGroupButton: {
    padding: spacing.small,
    marginTop: spacing.medium,
  },
});
