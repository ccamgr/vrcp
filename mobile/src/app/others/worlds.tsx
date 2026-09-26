import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import GenericScreen from "@/components/layout/GenericScreen";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useSetting } from "@/contexts/SettingContext";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { FlatList } from "react-native-gesture-handler";
import { navigationBarHeight, spacing } from "@/configs/styles";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import { routeToWorld } from "@/lib/route";
import {
  LimitedWorld,
  OrderOption,
  ReleaseStatus,
  SortOption,
} from "@/generated/vrcapi";
import { extractErrMsg } from "@/lib/utils";
import {
  type InfiniteListPageRequest,
  useInfiniteList,
} from "@/hooks/useInfiniteList";

const PAGE_SIZE = 50;

export default function MyWorlds() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const queryKey = ["vrc", "api", "worlds", "me"];
  const fetchWorlds = useCallback(
    async ({ offset, pageSize }: InfiniteListPageRequest) => {
      const res = await vrc.worldsApi.searchWorlds({
        offset,
        n: pageSize,
        user: "me",
        releaseStatus: ReleaseStatus.All,
        sort: SortOption.Updated,
        order: OrderOption.Descending,
      });
      return res.data;
    },
    [vrc.worldsApi],
  );
  const {
    items: worlds,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isRefreshing,
    refresh,
  } = useInfiniteList<LimitedWorld>({
    queryKey,
    enabled: !!vrc.worldsApi,
    pageSize: PAGE_SIZE,
    fetchPage: fetchWorlds,
    onError: (error) =>
      showToast("error", "Error fetching own worlds", extractErrMsg(error)),
  });

  const renderItem = useCallback(
    ({ item, index }: { item: LimitedWorld; index: number }) => (
      <CardViewWorld
        world={item}
        style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
        onPress={() => routeToWorld(item.id)}
      />
    ),
    [cardViewColumns],
  );
  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.worlds.no_worlds")}
        </Text>
      </View>
    ),
    [t, theme.colors.text],
  );

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      <FlatList
        data={worlds}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={isRefreshing}
        ListFooterComponent={isFetchingNextPage ? <LoadingIndicator /> : null}
        contentContainerStyle={styles.scrollContentContainer}
      />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cardView: {
    padding: spacing.small,
    width: "50%",
  },
  scrollContentContainer: {
    paddingBottom: navigationBarHeight,
  },
});
