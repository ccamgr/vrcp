import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import GenericScreen from "@/components/layout/GenericScreen";
import { TouchableEx, ButtonEx } from "@/components/CustomElements";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useSetting } from "@/contexts/SettingContext";
import { Avatar, OrderOption, ReleaseStatus, SortOption } from "@/generated/api";
import { extractErrMsg } from "@/libs/utils";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import { routeToAvatar } from "@/libs/route";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { FlatList } from "react-native-gesture-handler";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { useLocalSearchParams } from "expo-router";

export default function MyAvatars() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions.layouts.cardViewColumns;
  const NumPerReq = 50;
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const offset = useRef(0);

  const fetchAvatars = async () => {
    if (fetchingRef.current || offset.current < 0) return;
    fetchingRef.current = true;
    try {
      const res = await vrc.avatarsApi.searchAvatars({
        offset: offset.current,
        n: NumPerReq,
        user: "me",
        releaseStatus: ReleaseStatus.All,
        sort: SortOption.Updated,
        order: OrderOption.Descending,
      });
      if (res.data.length === 0) {
        offset.current = -1; // reset offset if no more data
      } else {
        setAvatars(prev => [...prev, ...res.data]);
        offset.current += NumPerReq;
      }
    } catch (e) {
      showToast("error", "Error fetching own avatars", extractErrMsg(e));
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const reload = () => {
    offset.current = 0;
    setAvatars([]);
    fetchAvatars();
  };

  const renderItem = useCallback(({ item }: { item: Avatar }) => (
    <CardViewAvatar
      avatar={item}
      style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
      onPress={() => routeToAvatar(item.id)}
    />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>
        {t("pages.avatars.no_avatars")}
      </Text>
    </View>
  ), []);

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      <FlatList
        // key={`avatar-list-col-${cardViewColumns}`} // to re-render on column change
        data={avatars}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
        onEndReached={fetchAvatars}
        onEndReachedThreshold={0.5}
        onRefresh={reload}
        refreshing={isLoading}
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
