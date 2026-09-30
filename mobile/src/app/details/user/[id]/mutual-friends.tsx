import GenericScreen from "@/components/layout/GenericScreen";
import CardViewUser from "@/components/view/item-CardView/CardViewUser";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useToast } from "@/contexts/ToastContext";
import { MutualFriend } from "@/generated/vrcapi";
import { useMutualFriends } from "@/hooks/vrc/useMutualFriends";
import { routeToUser } from "@/lib/route";
import { extractErrMsg } from "@/lib/utils";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { TouchableEx } from "@/components/CustomElements";
import { useTranslation } from "react-i18next";

export default function MutualFriends() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const {
    items: friends,
    canFetch,
    fetchNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    isRefreshing,
    refetch,
  } = useMutualFriends(id, (error) =>
    showToast("error", "Error fetching mutual friends", extractErrMsg(error)),
  );

  const renderItem = useCallback(
    ({ item }: { item: MutualFriend }) => (
      <CardViewUser
        user={item}
        style={styles.cardView}
        onPress={() => routeToUser(item.id)}
      />
    ),
    [],
  );
  const emptyComponent = useCallback(
    () => (
      <TouchableEx
        disabled={!isError}
        onPress={isError ? () => void refetch() : undefined}
        style={styles.empty}
      >
        <Text style={{ color: theme.colors.text }}>
          {isError || !canFetch
            ? t("pages.detail_user_mutual_friends.unavailable")
            : t("pages.detail_user_mutual_friends.no_friends_found")}
        </Text>
      </TouchableEx>
    ),
    [canFetch, isError, refetch, t, theme.colors.text],
  );

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={2}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        onRefresh={canFetch ? () => void refetch() : undefined}
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
  empty: {
    alignItems: "center",
    marginTop: spacing.large,
  },
  scrollContentContainer: {
    paddingBottom: navigationBarHeight,
  },
});
