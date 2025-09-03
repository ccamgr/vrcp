import { LimitedUserFriend, User, UserState } from "@/api/vrchat";
import GenericScreen from "@/components/GenericScreen";
import ListViewUser from "@/components/item-ListView/ListViewUser";
import LoadingIndicator from "@/components/LoadingIndicator";
import SelectGroupButton from "@/components/SelectGroupButton";
import { spacing } from "@/config/styles";
import useVRChat from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { routeToUser } from "@/lib/route";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

export default function Friends() {
  const vrc = useVRChat();
  const theme = useTheme();
  const NumPerReq = 50;

  const MaterialTab = createMaterialTopTabNavigator();

  const FavoriteFriendsTab = () => {
    const [onlinefriends, setOnlineFriends] = useState<User[]>([]);
    const [activefriends, setActiveFriends] = useState<User[]>([]);
    const [offlinefriends, setOfflineFriends] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userState, setUserState] = useState<UserState>("online");
    const offset = useRef(0);
    const fetchFriends = async () => {
      try {
        const res = await vrc.favoritesApi.getFavorites(NumPerReq, offset.current, "friend");
        if (res.data) {
          Promise.allSettled(res.data.map((fvrt) => vrc.usersApi.getUser(fvrt.favoriteId)))
            .then((resList) => {
              const users = resList.filter((r) => r.status === "fulfilled").map((r) => r.value.data);
              setOnlineFriends(users.filter(u => u.state === "online"));
              setActiveFriends(users.filter(u => u.state === "active"));
              setOfflineFriends(users.filter(u => u.state === "offline"));
              offset.current += NumPerReq;
              setIsLoading(false);
            })
            .catch((e) => {
              console.error("Error fetching favorite friends:", extractErrMsg(e));
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      } catch (e) {
        console.error("Error fetching friends:", extractErrMsg(e));
        setIsLoading(false);
      }
    };

    useEffect(()=>{
      setOnlineFriends([]); // Reset friends when group changes
      setActiveFriends([]);
      setOfflineFriends([]);
      offset.current = 0;
      setIsLoading(true);
      fetchFriends(); // Fetch friends for the new group
    },[])


    return (
      <View style={{ flex: 1 }}>
        { isLoading && <LoadingIndicator /> }
        <SelectGroupButton
          style={styles.selectGroupButton}
          data={["online", "active", "offline"] as UserState[]}
          value={userState}
          onChange={setUserState}
          nameExtractor={(item) => item}
        />
        <FlatList
          data={userState === "online" ? onlinefriends : userState === "active" ? activefriends : offlinefriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser user={item} style={styles.cardView} onPress={() => routeToUser(item.id)} />
          )}
          numColumns={1}
        />
      </View>
    )
  }
  const OnlineFriendsTab = () => {
    const [friends, setFriends] = useState<LimitedUserFriend[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const res = await vrc.friendsApi.getFriends(offset.current, NumPerReq, false);
        const statelist = (await vrc.authenticationApi.getCurrentUser()).data.onlineFriends
        setFriends((prev) => [...prev, ...res.data.filter(f => statelist?.some(s => s === f.id))]);
        offset.current += NumPerReq;
      } catch (e) {
        console.error("Error fetching friends:", extractErrMsg(e));
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      offset.current = 0; // Reset offset on mount
      fetchFriends();
    }, []);
    return (
      <>
        { isLoading && <LoadingIndicator /> }
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser user={item} style={styles.cardView} onPress={() => routeToUser(item.id)} />
          )}
          numColumns={1}
          onEndReached={fetchFriends}
          onEndReachedThreshold={0.3}
        />
      </>
    )
  }
  const ActiveFriendsTab = () => {
    const [friends, setFriends] = useState<LimitedUserFriend[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const res = await vrc.friendsApi.getFriends(offset.current, NumPerReq, false);
        const statelist = (await vrc.authenticationApi.getCurrentUser()).data.activeFriends
        setFriends((prev) => [...prev, ...res.data.filter(f => statelist?.some(s => s === f.id))]);
        offset.current += NumPerReq;
      } catch (e) {
        console.error("Error fetching friends:", extractErrMsg(e));
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      offset.current = 0; // Reset offset on mount
      fetchFriends();
    }, []);
    return (
      <>
        { isLoading && <LoadingIndicator /> }
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser user={item} style={styles.cardView} onPress={() => routeToUser(item.id)} />
          )}
          numColumns={1}
          onEndReached={fetchFriends}
          onEndReachedThreshold={0.3}
        />
      </>
    )
  }
  const OfflineFriendsTab = () => {
    const [friends, setFriends] = useState<LimitedUserFriend[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);
    const fetchFriends = async () => {
      try {
        setIsLoading(true);
        const res = await vrc.friendsApi.getFriends(offset.current, NumPerReq, true);
        setFriends((prev) => [...prev, ...res.data]);
        offset.current += NumPerReq;
      } catch (e) {
        console.error("Error fetching friends:", extractErrMsg(e));
      } finally {
        setIsLoading(false);
      }
    };
    useEffect(() => {
      offset.current = 0;
      fetchFriends();
    }, []);
    return (
      <>
        { isLoading && <LoadingIndicator /> }
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser user={item} style={styles.cardView} onPress={() => routeToUser(item.id)} />
          )}
          numColumns={1}
          onEndReached={fetchFriends}
          onEndReachedThreshold={0.3}
        />
      </>
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
          name="favorite" 
          options={{tabBarLabel: "Favorite"}}
          component={FavoriteFriendsTab} 
        />
        <MaterialTab.Screen 
          name="online" 
          options={{tabBarLabel: "Online"}}
          component={OnlineFriendsTab} 
        />
        <MaterialTab.Screen 
          name="active" 
          options={{tabBarLabel: "Active"}}
          component={ActiveFriendsTab} 
        />
        <MaterialTab.Screen 
          name="offline" 
          options={{tabBarLabel: "Offline"}}
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
