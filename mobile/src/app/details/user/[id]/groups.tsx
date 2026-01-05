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
import { routeToGroup, routeToWorld } from "@/libs/route";
import { Group, LimitedUserGroups, LimitedWorld, OrderOption, ReleaseStatus, SortOption } from "@/vrchat/api";
import { extractErrMsg } from "@/libs/utils";
import { useLocalSearchParams } from "expo-router";
import CardViewGroup from "@/components/view/item-CardView/CardViewGroup";

export default function UserGroups() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vrc = useVRChat();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const NumPerReq = 50;

  const [groups, setGroups] = useState<LimitedUserGroups[]>([]);
  const fetchingRef = useRef(false);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
  const offset = useRef(0);

  const fetchGroups = async () => {
    if (fetchingRef.current || offset.current < 0) return;
    fetchingRef.current = true;
    try {
      const res = await vrc.usersApi.getUserGroups({
        userId: id,
      });
      if (res.data.length === 0) {
        offset.current = -1; // reset offset if no more data
      } else {
        setGroups(prev => [...prev, ...res.data]);
        offset.current += NumPerReq;
      }
    } catch (e) {
      showToast("error", "Error fetching own worlds", extractErrMsg(e));
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const reload = () => {
    offset.current = 0;
    setGroups([]);
    fetchGroups();
  }

  const renderItem = useCallback(({ item, index }: { item: LimitedUserGroups; index: number }) => (
    <CardViewGroup
      group={item}
      style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
      onPress={() => item.id && routeToGroup(item.id)}
    />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>
        {t("pages.detail_user_groups.no_groups_found")}
      </Text>
    </View>
  ), []);

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      <FlatList
        data={groups}
        keyExtractor={(item, index) => item.id ?? `group-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
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
