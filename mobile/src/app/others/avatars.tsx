import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import GenericScreen from "@/components/layout/GenericScreen";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useSetting } from "@/contexts/SettingContext";
import { useAuth } from "@/contexts/AuthContext";
import { vrcQueryKeys } from "@/lib/queryClient";
import {
  Avatar,
  OrderOption,
  ReleaseStatus,
  SortOption,
} from "@/generated/vrcapi";
import { extractErrMsg } from "@/lib/utils";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import { routeToAvatar } from "@/lib/route";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { FlatList } from "react-native-gesture-handler";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import {
  type InfiniteListPageRequest,
  useInfiniteList,
} from "@/hooks/useInfiniteList";

const PAGE_SIZE = 50;

export default function MyAvatars() {
  const vrc = useVRChat();
  const auth = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const queryKey = vrcQueryKeys.list(auth.user?.id ?? "", "avatars", "me");
  const fetchAvatars = useCallback(
    async ({ offset, pageSize }: InfiniteListPageRequest) => {
      const res = await vrc.avatarsApi.searchAvatars({
        offset,
        n: pageSize,
        user: "me",
        releaseStatus: ReleaseStatus.All,
        sort: SortOption.Updated,
        order: OrderOption.Descending,
      });
      return res.data;
    },
    [vrc.avatarsApi],
  );
  const {
    items: avatars,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isRefreshing,
    refresh,
  } = useInfiniteList<Avatar>({
    queryKey,
    enabled: !!auth.user?.id && !!vrc.avatarsApi,
    pageSize: PAGE_SIZE,
    fetchPage: fetchAvatars,
    onError: (error) =>
      showToast("error", "Error fetching own avatars", extractErrMsg(error)),
  });

  const renderItem = useCallback(
    ({ item }: { item: Avatar }) => (
      <CardViewAvatar
        avatar={item}
        style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
        onPress={() => routeToAvatar(item.id)}
      />
    ),
    [cardViewColumns],
  );
  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.avatars.no_avatars")}
        </Text>
      </View>
    ),
    [t, theme.colors.text],
  );

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <FlatList
        // key={`avatar-list-col-${cardViewColumns}`} // to re-render on column change
        data={avatars}
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
