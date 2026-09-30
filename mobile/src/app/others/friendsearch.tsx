import GenericScreen from "@/components/layout/GenericScreen";
import SearchBox from "@/components/view/SearchBox";
import ListViewUser from "@/components/view/item-ListView/ListViewUser";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useFriends } from "@/hooks/vrc/useFriends";
import { routeToUser } from "@/lib/route";
import { useTheme } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, View } from "react-native";

export default function FriendSearch() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: friends, isLoading } = useFriends();
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchingFriends = useMemo(
    () =>
      normalizedSearch
        ? (friends ?? []).filter((friend) => {
            const displayName = friend.displayName.toLocaleLowerCase();
            return (
              displayName.includes(normalizedSearch) ||
              friend.id.toLocaleLowerCase().includes(normalizedSearch)
            );
          })
        : [],
    [friends, normalizedSearch],
  );

  return (
    <GenericScreen>
      <View style={styles.searchBoxContainer}>
        <SearchBox
          onSubmit={setSearch}
          placeholder={t("pages.friends.searchModal_placeholder")}
        />
      </View>
      {isLoading ? (
        <LoadingIndicator absolute />
      ) : (
        <FlatList
          data={matchingFriends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListViewUser
              user={item}
              onPress={() => routeToUser(item.id)}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.message, { color: theme.colors.subText }]}>
              {normalizedSearch
                ? t("pages.friends.searchModal_noResults")
                : t("pages.friends.searchModal_empty")}
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  searchBoxContainer: {
    marginTop: spacing.medium,
  },
  listContent: {
    paddingTop: spacing.medium,
    paddingBottom: navigationBarHeight + spacing.medium,
  },
  message: {
    padding: spacing.large,
    textAlign: "center",
  },
});
