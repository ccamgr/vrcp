import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
import { routeToGroup, routeToWorld } from "@/lib/route";
import {
  Group,
  LimitedUserGroups,
  LimitedWorld,
  OrderOption,
  ReleaseStatus,
  SortOption,
} from "@/generated/vrcapi";
import { extractErrMsg } from "@/lib/utils";
import { useLocalSearchParams } from "expo-router";
import CardViewGroup from "@/components/view/item-CardView/CardViewGroup";
import { useCurrentUser } from "@/hooks/vrc/useCurrentUser";

export default function MyGroups() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { data: currentUser } = useCurrentUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const NumPerReq = 50;

  const [groups, setGroups] = useState<LimitedUserGroups[]>([]);
  const fetchingRef = useRef(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const offset = useRef(0);

  const fetchGroups = useCallback(async () => {
    const userId = currentUser?.id;
    if (!userId) return;
    if (fetchingRef.current || offset.current < 0) return;
    fetchingRef.current = true;
    try {
      const res = await vrc.usersApi.getUserGroups({
        userId,
      });
      if (res.data.length === 0) {
        offset.current = -1; // reset offset if no more data
      } else {
        setGroups((prev) => [...prev, ...res.data]);
        offset.current += NumPerReq;
      }
    } catch (e) {
      showToast("error", "Error fetching own worlds", extractErrMsg(e));
    } finally {
      fetchingRef.current = false;
    }
  }, [currentUser?.id, showToast, vrc.usersApi]);

  useEffect(() => {
    if (!currentUser?.id) return;
    void fetchGroups().finally(() => setIsInitialLoading(false));
  }, [currentUser?.id, fetchGroups]);

  const reload = async () => {
    if (isRefreshing) return;

    offset.current = 0;
    setGroups([]);
    setIsRefreshing(true);
    try {
      await fetchGroups();
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: LimitedUserGroups; index: number }) => (
      <CardViewGroup
        group={item}
        style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
        onPress={() => item.id && routeToGroup(item.id)}
      />
    ),
    [],
  );
  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.groups.no_groups")}
        </Text>
      </View>
    ),
    [],
  );

  return (
    <GenericScreen>
      {isInitialLoading && <LoadingIndicator absolute />}
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <FlatList
        data={groups}
        keyExtractor={(item, index) => item.id ?? `group-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
        onRefresh={reload}
        refreshing={isRefreshing}
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
