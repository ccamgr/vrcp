import { TouchableEx } from "@/components/CustomElements";
import GenericScreen from "@/components/layout/GenericScreen";
import CardViewGroup from "@/components/view/item-CardView/CardViewGroup";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useSetting } from "@/contexts/SettingContext";
import { useToast } from "@/contexts/ToastContext";
import { LimitedUserGroups } from "@/generated/vrcapi";
import { useMutualGroups } from "@/hooks/vrc/useMutualGroups";
import { routeToGroup } from "@/lib/route";
import { extractErrMsg } from "@/lib/utils";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

export default function MutualGroups() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const {
    items: groups,
    canFetch,
    fetchNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    isRefreshing,
    refetch,
  } = useMutualGroups(id, (error) =>
    showToast("error", "Error fetching mutual groups", extractErrMsg(error)),
  );

  const renderItem = useCallback(
    ({ item }: { item: LimitedUserGroups }) => (
      <CardViewGroup
        group={item}
        style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
        onPress={() => item.id && routeToGroup(item.id)}
      />
    ),
    [cardViewColumns],
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
            ? t("pages.detail_user_mutual_groups.unavailable")
            : t("pages.detail_user_mutual_groups.no_groups_found")}
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
        data={groups}
        keyExtractor={(item, index) => item.id ?? `group-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
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
