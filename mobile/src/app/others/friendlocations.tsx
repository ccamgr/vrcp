import GenericScreen from "@/components/layout/GenericScreen";
import UserOrGroupChip from "@/components/view/chip-badge/UserOrGroupChip";
import CardViewInstance from "@/components/view/item-CardView/CardViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { calcFriendsLocations } from "@/lib/funcs/calcFriendLocations";
import { routeToInstance, routeToUser } from "@/lib/route";
import { InstanceLike } from "@/lib/vrchat";
import { LimitedUserFriend } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, SectionList, StyleSheet, Text, View } from "react-native";
import { useToast } from "@/contexts/ToastContext";
import { extractErrMsg } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { TouchableEx } from "@/components/CustomElements";
import { useFriends } from "@/hooks/vrc/useFriends";
import { useFavorites } from "@/hooks/vrc/useFavorites";
import { useCurrentUser } from "@/hooks/vrc/useCurrentUser";
import { useSetting } from "@/contexts/SettingContext";
import { filterFriendLocations } from "@/lib/funcs/filterFriendLocations";

export default function FriendLocations() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const { data: friends, refetch, isLoading: isLoadingFriends } = useFriends();
  const {
    data: favorites,
    refetch: refetchFavorites,
    isLoading: isLoadingFavorites,
  } = useFavorites();
  const {
    data: currentUser,
    refetch: refetchCurrentUser,
    isLoading: isLoadingCurrentUser,
  } = useCurrentUser();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoading =
    isLoadingFriends || isLoadingFavorites || isLoadingCurrentUser;
  const refresh = () => {
    setIsRefreshing(true);
    Promise.all([refetch(), refetchFavorites(), refetchCurrentUser()])
      .catch((e) =>
        showToast("error", "Error refreshing friends", extractErrMsg(e)),
      )
      .finally(() => setIsRefreshing(false));
  };

  const { instances, unlocatableFriends } = useMemo(() => {
    const filteredFriends = filterFriendLocations(
      friends ?? [],
      favorites ?? [],
      settings.uiOptions_friendLocationsFilter,
    );
    return calcFriendsLocations(filteredFriends, true, currentUser?.location);
  }, [
    currentUser?.location,
    favorites,
    friends,
    settings.uiOptions_friendLocationsFilter,
  ]);

  const renderInstItem = useCallback(
    ({ item, index }: { item: InstanceLike[]; index: number }) => (
      <View style={styles.chunk}>
        {item.map((instance: InstanceLike) => (
          <CardViewInstance
            key={instance.id}
            instance={instance}
            style={styles.cardView}
            onPress={() =>
              routeToInstance(instance.worldId, instance.instanceId)
            }
          />
        ))}
      </View>
    ),
    [],
  );
  const renderUnlocItem = useCallback(
    ({ item, index }: { item: LimitedUserFriend[]; index: number }) => (
      <View style={styles.chunk}>
        {item.map((friend: LimitedUserFriend) => (
          <TouchableEx
            key={friend.id}
            style={styles.userChip}
            onPress={() => routeToUser(friend.id)}
          >
            <UserOrGroupChip data={friend} />
          </TouchableEx>
        ))}
      </View>
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

  const chunkInstances = useMemo(() => chunkArray(instances, 2), [instances]);
  const chunkUnlocatableFriends = useMemo(
    () => chunkArray(unlocatableFriends, 3),
    [unlocatableFriends],
  );

  const sections: {
    title: string;
    data: any[];
    keyExtractor: (item: any, index: number) => string;
    renderItem: ({
      item,
      index,
    }: {
      item: any;
      index: number;
    }) => React.ReactElement<
      unknown,
      string | React.JSXElementConstructor<any>
    > | null;
  }[] = useMemo(
    () => [
      {
        title: t("pages.friendlocations.sectionLabel_instances"),
        data: chunkInstances,
        renderItem: renderInstItem,
        keyExtractor: (_, index) => `friend-instance-chunk-${index}`,
      },
      {
        title: t("pages.friendlocations.sectionLabel_private"),
        data: chunkUnlocatableFriends,
        renderItem: renderUnlocItem,
        keyExtractor: (_, index) => `private-friend-chunk-${index}`,
      },
    ],
    [chunkInstances, chunkUnlocatableFriends],
  );

  return (
    <GenericScreen>
      <View style={styles.container}>
        {isLoading && <LoadingIndicator absolute />}
        {isRefreshing && <LoadingIndicator absolute overlayOnly />}
        <SectionList
          sections={sections}
          renderSectionHeader={renderSecHeader}
          contentContainerStyle={styles.listInner}
          refreshing={isRefreshing}
          onRefresh={refresh}
        />
      </View>
    </GenericScreen>
  );
}

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingTop: spacing.medium,
    marginBottom: spacing.small,
    borderBottomWidth: 1,
  },
  chunk: {
    flexDirection: "row",
    marginBottom: spacing.small,
  },
  cardView: {
    width: "50%",
  },
  userChip: {
    width: "33%",
  },
  listInner: {
    paddingBottom: navigationBarHeight + spacing.medium,
  },
});
