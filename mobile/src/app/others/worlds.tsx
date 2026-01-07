import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import GenericScreen from "@/components/layout/GenericScreen";
import { TouchableEx, ButtonEx } from "@/components/CustomElements";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useSetting } from "@/contexts/SettingContext";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { FlatList } from "react-native-gesture-handler";
import { navigationBarHeight, spacing } from "@/configs/styles";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import { routeToWorld } from "@/libs/route";
import { LimitedWorld, OrderOption, ReleaseStatus, SortOption } from "@/generated/vrcapi";
import { extractErrMsg } from "@/libs/utils";
import { useLocalSearchParams } from "expo-router";

export default function MyWorlds() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const NumPerReq = 50;

  const [worlds, setWorlds] = useState<LimitedWorld[]>([]);
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const offset = useRef(0);

  const fetchWorlds = async () => {
    if (fetchingRef.current || offset.current < 0) return;
    fetchingRef.current = true;
    try {
      const res = await vrc.worldsApi.searchWorlds({
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
        setWorlds(prev => [...prev, ...res.data]);
        offset.current += NumPerReq;
      }
    } catch (e) {
      showToast("error", "Error fetching own worlds", extractErrMsg(e));
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchWorlds();
  }, []);

  const reload = () => {
    offset.current = 0;
    setWorlds([]);
    fetchWorlds();
  }

  const renderItem = useCallback(({ item, index }: { item: LimitedWorld; index: number }) => (
    <CardViewWorld
      world={item}
      style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
      onPress={() => routeToWorld(item.id)}
    />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>
        {t("pages.worlds.no_worlds")}
      </Text>
    </View>
  ), []);

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      <FlatList
        data={worlds}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
        onEndReached={fetchWorlds}
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
