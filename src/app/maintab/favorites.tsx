import { Avatar, FavoriteGroup, User, World } from "@/api/vrchat";
import GenericScreen from "@/components/GenericScreen";
import CardViewAvatar from "@/components/item-CardView/CardViewAvatar";
import CardViewUser from "@/components/item-CardView/CardViewUser";
import CardViewWorld from "@/components/item-CardView/CardViewWorld";
import LoadingIndicator from "@/components/LoadingIndicator";
import SelectGroupButton from "@/components/SelectGroupButton";
import { spacing } from "@/config/styles";
import useVRChat from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { routeToAvatar, routeToUser, routeToWorld } from "@/lib/route";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function Favorites() {
  const vrc = useVRChat();
  const theme = useTheme();
  const [isLoadingGroup, setIsLoadingGroup] = useState<boolean>(false);
  const [favoriteGroups, setFavoriteGroups] = useState<{
    worlds: FavoriteGroup[]
    friends: FavoriteGroup[]
    avatars: FavoriteGroup[]
  }>({
    worlds: [],
    friends: [],
    avatars: []
  });
  const NumPerReq = 20; // Number of items to fetch per request

  const MaterialTab = createMaterialTopTabNavigator();

  const fetchFavoriteGroups = async () => {
    try{
      setIsLoadingGroup(true);
      const res = await vrc.favoritesApi.getFavoriteGroups();
      if (res.data) {
        setFavoriteGroups({
          worlds: res.data.filter((group) => group.type === "world").sort((a,b) => a.name.localeCompare(b.name)),
          friends: res.data.filter((group) => group.type === "friend").sort((a,b) => a.name.localeCompare(b.name)),
          avatars: res.data.filter((group) => group.type === "avatar").sort((a,b) => a.name.localeCompare(b.name)),
        });
      }
      setIsLoadingGroup(false);
    } catch (e) {
      console.error("Error fetching favorite groups:", extractErrMsg(e));
      setIsLoadingGroup(false);
    }
  };

  useEffect(()=>{
    fetchFavoriteGroups();
  },[])

  const WorldsTab = () => {
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(null);
    const [worlds, setWorlds] = useState<World[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);
    const fetchWorlds = async () => {
      if (!selectedGroup) return;
      try {
        const res = await vrc.favoritesApi.getFavorites(NumPerReq, offset.current, "world", selectedGroup.name);
        if (res.data) {
          Promise.allSettled(res.data.map((fvrt) => vrc.worldsApi.getWorld(fvrt.favoriteId)))
            .then((resList) => {
              const worlds = resList.filter((r) => r.status === "fulfilled").map((r) => r.value.data);
              setWorlds((prev) => [...prev, ...worlds]);
              offset.current += NumPerReq;
              setIsLoading(false);
            })
            .catch((e) => {
              console.error("Error fetching favorite worlds:", extractErrMsg(e));
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      } catch (e) {
        console.error("Error fetching worlds:", extractErrMsg(e));
        setIsLoading(false);
      }
    };

    useEffect(()=>{
      setSelectedGroup(favoriteGroups.worlds[0] || null);
    },[favoriteGroups.worlds])

    useEffect(()=>{
      setWorlds(_ => []);
      offset.current = 0;
      setIsLoading(true);
      fetchWorlds(); // Fetch worlds for the new group
    },[selectedGroup])

    return (
      <View style={{ flex: 1 }}>
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={favoriteGroups.worlds}
          value={selectedGroup}
          onChange={setSelectedGroup}
          nameExtractor={(item) => item.displayName.length > 0 ? item.displayName : undefined}
        />
        { isLoading && <LoadingIndicator /> }
        { selectedGroup ? (
          <FlatList
            data={worlds}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardViewWorld world={item} style={styles.cardView} onPress={() => routeToWorld(item.id)} />
            )}
            numColumns={2}
            onEndReached={fetchWorlds}
            onEndReachedThreshold={0.8}
          />
        ) : (
          <Text>No Favorite Group Selected</Text>
        )}
      </View>
    )
  }
  const FriendsTab = () => {
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(null);
    const [friends, setFriends] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);
    const fetchFriends = async () => {
      if (!selectedGroup) return;
      try {
        const res = await vrc.favoritesApi.getFavorites(NumPerReq, offset.current, "friend", selectedGroup.name);
        if (res.data) {
          Promise.allSettled(res.data.map((fvrt) => vrc.usersApi.getUser(fvrt.favoriteId)))
            .then((resList) => {
              const users = resList.filter((r) => r.status === "fulfilled").map((r) => r.value.data);
              setFriends((prev) => [...prev, ...users]);
              offset.current += NumPerReq;
              setIsLoading(false);
            })
            .catch((e) => {
              console.error("Error fetching favorite friends:", extractErrMsg(e));
              setIsLoading(false);
            });
        }
      } catch (e) {
        console.error("Error fetching friends:", extractErrMsg(e));
        setIsLoading(false);
      }
    };

    useEffect(()=>{
      setSelectedGroup(favoriteGroups.friends[0] || null);
    },[favoriteGroups.friends])

    useEffect(()=>{
      setFriends(_ => []); // Reset friends when group changes
      offset.current = 0;
      setIsLoading(true);
      fetchFriends(); // Fetch friends for the new group
    },[selectedGroup])

    return (
      <View style={{ flex: 1 }}>
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={favoriteGroups.friends}
          value={selectedGroup}
          onChange={setSelectedGroup}
          nameExtractor={(item) => item.displayName.length > 0 ? item.displayName : undefined}
        />
        { isLoading && <LoadingIndicator /> }
        { selectedGroup ? (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardViewUser user={item} style={styles.cardView} onPress={() => routeToUser(item.id)} />
            )}
            numColumns={2}
            onEndReached={fetchFriends}
            onEndReachedThreshold={0.8}
          />
        ) : (
          <Text>No Favorite Group Selected</Text>
        )}
      </View>
    )
  }
  const AvatarsTab = () => {
    const [selectedGroup, setSelectedGroup] = useState<FavoriteGroup | null>(null);
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);
    const fetchAvatars = async () => {
      if (!selectedGroup) return;
      try {
        const res = await vrc.favoritesApi.getFavorites(NumPerReq, offset.current, "avatar", selectedGroup.name);
        if (res.data) {
          Promise.allSettled(res.data.map((fvrt) => vrc.avatarsApi.getAvatar(fvrt.favoriteId)))
            .then((resList) => {
              const avatars = resList.filter((r) => r.status === "fulfilled").map((r) => r.value.data);
              setAvatars((prev) => [...prev, ...avatars]);
              offset.current += NumPerReq;
              setIsLoading(false);
            })
            .catch((e) => {
              console.error("Error fetching favorite avatars:", extractErrMsg(e));
              setIsLoading(false);
            });
        }
      } catch (e) {
        console.error("Error fetching avatars:", extractErrMsg(e));
        setIsLoading(false);
      }
    };

    useEffect(()=>{
      setSelectedGroup(favoriteGroups.avatars[0] || null);
    },[favoriteGroups.avatars])

    useEffect(()=>{
      setAvatars(_ => []); // Reset avatars when group changes
      offset.current = 0;
      setIsLoading(true);
      fetchAvatars(); // Fetch avatars for the new group
    },[selectedGroup])

    return (
      <View style={{ flex: 1 }}>
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={favoriteGroups.avatars}
          value={selectedGroup}
          onChange={setSelectedGroup}
          nameExtractor={(item) => item.displayName.length > 0 ? item.displayName : undefined}
        />
        { isLoading && <LoadingIndicator /> }
        { selectedGroup ? (
          <FlatList
            data={avatars}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CardViewAvatar avatar={item} style={styles.cardView} onPress={() => routeToAvatar(item.id)} />
            )}
            numColumns={2}
            onEndReached={fetchAvatars}
            onEndReachedThreshold={0.8}
          />
        ) : (
          <Text>No Favorite Group Selected</Text>
        )}
      </View>
    )
  }

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
