import GenericScreen from "@/components/layout/GenericScreen";
import CardViewGroup from "@/components/view/item-CardView/CardViewGroup";
import CardViewUser from "@/components/view/item-CardView/CardViewUser";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import SearchBox from "@/components/view/SearchBox";
import { spacing } from "@/config/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { routeToGroup, routeToUser, routeToWorld } from "@/lib/route";
import {
  GroupsApi,
  LimitedGroup,
  LimitedUserSearch,
  LimitedWorld,
  SortOption,
  UsersApi,
  WorldsApi,
} from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

export default function Search() {
  const vrc = useVRChat();
  const theme = useTheme();
  const initialParams = useLocalSearchParams<{ query: string }>();
  const [query, setQuery] = useState(initialParams.query || "");
  const limit = 50; // Number of items to fetch per request

  const MaterialTab = createMaterialTopTabNavigator();

  const handleSearch = (search: string) => {
    setQuery(search);
  };

  // Worlds Tab
  const ResultWorldsTab = () => {
    const [worlds, setWorlds] = useState<LimitedWorld[]>([]);
    const offset = useRef(0);
    const fetchWorlds = async () => {
      try {
        const res = await new WorldsApi(vrc.config).searchWorlds({
          sort: SortOption.Magic,
          n: limit,
          offset: offset.current,
          search: query,
        });
        setWorlds((prev) => [...prev, ...res.data]);
        offset.current += limit;
      } catch (error) {
        console.error("Error searching worlds:", extractErrMsg(error));
      }
    };
    useEffect(() => {
      if (query.length === 0) return;
      offset.current = 0;
      fetchWorlds();
    }, [query]);

    return (
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
        onEndReached={fetchWorlds}
        onEndReachedThreshold={0.3}
      />
    );
  };

  // User Tab
  const ResultUsersTab = () => {
    const [users, setUsers] = useState<LimitedUserSearch[]>([]);
    const offset = useRef(0);
    const fetchUsers = async () => {
      try {
        const res = await new UsersApi(vrc.config).searchUsers({
          n: limit,
          offset: offset.current,
          search: query,
        });
        setUsers((prev) => [...prev, ...res.data]);
        offset.current += limit;
      } catch (error) {
        console.error("Error searching users:", extractErrMsg(error));
      }
    };
    useEffect(() => {
      if (query.length === 0) return;
      offset.current = 0;
      fetchUsers();
    }, [query]);

    return (
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardViewUser
            user={item}
            style={styles.cardView}
            onPress={() => routeToUser(item.id)}
          />
        )}
        numColumns={2}
        onEndReached={fetchUsers}
        onEndReachedThreshold={0.3}
      />
    );
  };

  // Groups Tab
  const ResultGroupsTab = () => {
    const [groups, setGroups] = useState<LimitedGroup[]>([]);
    const offset = useRef(0);

    const fetchGroups = async () => {
      try {
        const res = await new GroupsApi(vrc.config).searchGroups({
          n: limit,
          offset: offset.current,
          query: query,
        });
        setGroups((prev) => [...prev, ...res.data]);
        offset.current += limit;
      } catch (error) {
        console.error("Error searching groups:", extractErrMsg(error));
      }
    };
    useEffect(() => {
      if (query.length === 0) return;
      offset.current = 0;
      fetchGroups();
    }, [query]);

    return (
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id ?? ""}
        renderItem={({ item }) => (
          <CardViewGroup
            group={item}
            style={styles.cardView}
            onPress={() => routeToGroup(item.id ?? "")}
          />
        )}
        numColumns={2}
        onEndReached={fetchGroups}
        onEndReachedThreshold={0.3}
      />
    );
  };

  return (
    <GenericScreen>
      <View style={styles.searchBoxContainer}>
        <SearchBox
          onSubmit={handleSearch}
          placeholder="Search worlds, avatars, and users..."
          defaultValue={initialParams.query || ""}
        />
      </View>
      <View style={styles.tabsContainer}>
        <MaterialTab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: theme.colors.background },
            tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
          }}
        >
          <MaterialTab.Screen
            name="worlds"
            options={{ tabBarLabel: "Worlds" }}
            component={ResultWorldsTab}
          />
          <MaterialTab.Screen
            name="users"
            options={{ tabBarLabel: "Users" }}
            component={ResultUsersTab}
          />
          <MaterialTab.Screen
            name="groups"
            options={{ tabBarLabel: "Groups" }}
            component={ResultGroupsTab}
          />
        </MaterialTab.Navigator>
      </View>
    </GenericScreen>
  );
}
const styles = StyleSheet.create({
  searchBoxContainer: {
    marginTop: spacing.medium,
  },
  tabsContainer: {
    flex: 1,
    marginTop: spacing.medium,
  },
  cardView: {
    padding: spacing.small,
    width: "50%",
  },
});
