import GenericScreen from "@/components/layout/GenericScreen";
import CardViewGroup from "@/components/view/item-CardView/CardViewGroup";
import CardViewUser from "@/components/view/item-CardView/CardViewUser";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import SearchBox from "@/components/view/SearchBox";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { routeToAvatar, routeToGroup, routeToUser, routeToWorld } from "@/libs/route";
import {
  Avatar,
  AvatarsApi,
  GroupsApi,
  LimitedGroup,
  LimitedUserSearch,
  LimitedWorld,
  SortOption,
  UsersApi,
  WorldsApi,
} from "@/generated/vrcapi";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import LoadingIndicator from "@/components/view/LoadingIndicator";

export default function Search() {
  const vrc = useVRChat();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const initialParams = useLocalSearchParams<{ search?: string }>();
  const [search, setSearch] = useState(initialParams.search || "");
  const limit = 50; // Number of items to fetch per request

  const MaterialTab = createMaterialTopTabNavigator();

  const handleSearch = (search: string) => {
    setSearch(search);
  };


  // Worlds Tab (search)
  const ResultWorldsTab = () => {
    const [worlds, setWorlds] = useState<LimitedWorld[]>([]);
    const offset = useRef(0);
    const fetchingRef = useRef(false);
    const [ isLoading, setIsLoading ] = useState(false);
    const fetchWorlds = async () => {
      try {
        if (fetchingRef.current) return; // Prevent multiple simultaneous fetches
        fetchingRef.current = true;
        setIsLoading(true);
        const res = await new WorldsApi(vrc.config).searchWorlds({
          sort: SortOption.Magic,
          n: limit,
          offset: offset.current,
          search: search,
        });
        setWorlds((prev) => [...prev, ...res.data]);
        offset.current += limit;
      } catch (error) {
        showToast("error", "Error searching worlds", extractErrMsg(error));
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
      }
    };
    useEffect(() => {
      offset.current = 0;
      fetchWorlds();
    }, [search]);

    const emptyComponent = useCallback(() => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.search.no_worlds_found", { search: search })}
        </Text>
      </View>
    ), [search, t, theme.colors.text]);

    return (
      <>
        { isLoading && <LoadingIndicator absolute /> }
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
          ListEmptyComponent={emptyComponent}
          numColumns={2}
          onEndReached={fetchWorlds}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listInner}
        />
      </>
    );
  };

  // User Tab (search only)
  const ResultUsersTab = () => {
    const [users, setUsers] = useState<LimitedUserSearch[]>([]);
    const offset = useRef(0);
    const fetchingRef = useRef(false);
    const [ isLoading, setIsLoading ] = useState(false);
    const fetchUsers = async () => {
      try {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setIsLoading(true);
        const res = await new UsersApi(vrc.config).searchUsers({
          n: limit,
          offset: offset.current,
          search: search,
        });
        setUsers((prev) => [...prev, ...res.data]);
        offset.current += limit;
      } catch (error) {
        showToast("error", "Error searching users", extractErrMsg(error));
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
      }
    };
    useEffect(() => {
      offset.current = 0;
      fetchUsers();
    }, [search]);

    const emptyComponent = useCallback(() => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.search.no_users_found", { search: search })}
        </Text>
      </View>
    ), [search, t, theme.colors.text]);
    return (
      <>
        { isLoading && <LoadingIndicator absolute /> }
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
          ListEmptyComponent={emptyComponent}
          numColumns={2}
          onEndReached={fetchUsers}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listInner}
        />
      </>
    );
  };

  // Groups Tab (search only)
  const ResultGroupsTab = () => {
    const [groups, setGroups] = useState<LimitedGroup[]>([]);
    const offset = useRef(0);
    const fetchingRef = useRef(false);
    const [ isLoading, setIsLoading ] = useState(false);

    const fetchGroups = async () => {
      try {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setIsLoading(true);
        const res = await new GroupsApi(vrc.config).searchGroups({
          n: limit,
          offset: offset.current,
          query: search,
        });
        setGroups((prev) => [...prev, ...res.data]);
        offset.current += limit;
      } catch (error) {
        showToast("error", "Error searching groups", extractErrMsg(error));
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
      }
    };
    useEffect(() => {
      offset.current = 0;
      fetchGroups();
    }, [search]);

    const emptyComponent = useCallback(() => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.search.no_groups_found", { search: search })}
        </Text>
      </View>
    ), [search, t, theme.colors.text]);

    return (
      <>
        { isLoading && <LoadingIndicator absolute /> }
        <FlatList
          data={groups}
          keyExtractor={(item, index) => item.id || `unknown-${index}`}
          renderItem={({ item }) => (
            <CardViewGroup
              group={item}
              style={styles.cardView}
              onPress={() => routeToGroup(item.id ?? "")}
            />
          )}
          ListEmptyComponent={emptyComponent}
          numColumns={2}
          onEndReached={fetchGroups}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listInner}
        />
      </>
    );
  };

  return (
    <GenericScreen>
      <View style={styles.searchBoxContainer}>
        <SearchBox
          onSubmit={handleSearch}
          placeholder={t("pages.search.searchbox_placeholder")}
          defaultValue={initialParams.search || ""}
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
            component={useCallback(ResultWorldsTab, [search])}
          />
          <MaterialTab.Screen
            name="users"
            options={{ tabBarLabel: "Users" }}
            component={useCallback(ResultUsersTab, [search])}
          />
          <MaterialTab.Screen
            name="groups"
            options={{ tabBarLabel: "Groups" }}
            component={useCallback(ResultGroupsTab, [search])}
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
  listInner: {
    paddingBottom: navigationBarHeight + spacing.medium,
  },
});
