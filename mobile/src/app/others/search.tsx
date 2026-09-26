import GenericScreen from "@/components/layout/GenericScreen";
import CardViewGroup from "@/components/view/item-CardView/CardViewGroup";
import CardViewUser from "@/components/view/item-CardView/CardViewUser";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import SearchBox from "@/components/view/SearchBox";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/utils";
import { routeToGroup, routeToUser, routeToWorld } from "@/lib/route";
import {
  LimitedGroup,
  LimitedUserSearch,
  LimitedWorld,
  SortOption,
} from "@/generated/vrcapi";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import {
  type InfiniteListPageRequest,
  useInfiniteList,
} from "@/hooks/useInfiniteList";
import { useToast } from "@/contexts/ToastContext";

const PAGE_SIZE = 50;

export default function Search() {
  const vrc = useVRChat();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const initialParams = useLocalSearchParams<{ search?: string }>();
  const [search, setSearch] = useState(initialParams.search || "");

  const MaterialTab = createMaterialTopTabNavigator();

  const handleSearch = (search: string) => {
    setSearch(search);
  };

  // Worlds Tab (search)
  const ResultWorldsTab = () => {
    const queryKey = ["vrc", "api", "search", "worlds", search];
    const fetchWorlds = async ({
      offset,
      pageSize,
    }: InfiniteListPageRequest) => {
      const res = await vrc.worldsApi.searchWorlds({
        sort: SortOption.Magic,
        n: pageSize,
        offset,
        search,
      });
      return res.data;
    };
    const {
      items: worlds,
      fetchNextPage,
      isFetchingNextPage,
      isLoading,
    } = useInfiniteList<LimitedWorld>({
      queryKey,
      enabled: !!vrc.worldsApi,
      pageSize: PAGE_SIZE,
      fetchPage: fetchWorlds,
      onError: (error) =>
        showToast("error", "Error searching worlds", extractErrMsg(error)),
    });

    const emptyComponent = () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.search.no_worlds_found", { search })}
        </Text>
      </View>
    );

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
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
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listInner}
          ListFooterComponent={isFetchingNextPage ? <LoadingIndicator /> : null}
        />
      </>
    );
  };

  // User Tab (search only)
  const ResultUsersTab = () => {
    const queryKey = ["vrc", "api", "search", "users", search];
    const fetchUsers = async ({
      offset,
      pageSize,
    }: InfiniteListPageRequest) => {
      const res = await vrc.usersApi.searchUsers({
        n: pageSize,
        offset,
        search,
      });
      return res.data;
    };
    const {
      items: users,
      fetchNextPage,
      isFetchingNextPage,
      isLoading,
    } = useInfiniteList<LimitedUserSearch>({
      queryKey,
      enabled: !!vrc.usersApi,
      pageSize: PAGE_SIZE,
      fetchPage: fetchUsers,
      onError: (error) =>
        showToast("error", "Error searching users", extractErrMsg(error)),
    });

    const emptyComponent = () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.search.no_users_found", { search })}
        </Text>
      </View>
    );
    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
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
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listInner}
          ListFooterComponent={isFetchingNextPage ? <LoadingIndicator /> : null}
        />
      </>
    );
  };

  // Groups Tab (search only)
  const ResultGroupsTab = () => {
    const queryKey = ["vrc", "api", "search", "groups", search];
    const fetchGroups = async ({
      offset,
      pageSize,
    }: InfiniteListPageRequest) => {
      const res = await vrc.groupsApi.searchGroups({
        n: pageSize,
        offset,
        query: search,
      });
      return res.data;
    };
    const {
      items: groups,
      fetchNextPage,
      isFetchingNextPage,
      isLoading,
    } = useInfiniteList<LimitedGroup>({
      queryKey,
      enabled: !!vrc.groupsApi,
      pageSize: PAGE_SIZE,
      fetchPage: fetchGroups,
      onError: (error) =>
        showToast("error", "Error searching groups", extractErrMsg(error)),
    });

    const emptyComponent = () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.search.no_groups_found", { search })}
        </Text>
      </View>
    );

    return (
      <>
        {isLoading && <LoadingIndicator absolute />}
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
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listInner}
          ListFooterComponent={isFetchingNextPage ? <LoadingIndicator /> : null}
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
            component={useCallback(ResultWorldsTab, [
              search,
              showToast,
              t,
              theme.colors.text,
              vrc.worldsApi,
            ])}
          />
          <MaterialTab.Screen
            name="users"
            options={{ tabBarLabel: "Users" }}
            component={useCallback(ResultUsersTab, [
              search,
              showToast,
              t,
              theme.colors.text,
              vrc.usersApi,
            ])}
          />
          <MaterialTab.Screen
            name="groups"
            options={{ tabBarLabel: "Groups" }}
            component={useCallback(ResultGroupsTab, [
              search,
              showToast,
              t,
              theme.colors.text,
              vrc.groupsApi,
            ])}
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
