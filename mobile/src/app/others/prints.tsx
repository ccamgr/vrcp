import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import GenericScreen from "@/components/layout/GenericScreen";
import { TouchableEx, ButtonEx } from "@/components/CustomElements";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useSetting } from "@/contexts/SettingContext";
import { useLocalSearchParams } from "expo-router";
import CardViewPrint from "@/components/view/item-CardView/CardViewPrint";
import { navigationBarHeight, spacing } from "@/configs/styles";
import ImagePreview from "@/components/view/ImagePreview";
import { FlatList } from "react-native-gesture-handler";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { OrderOption, Print, SortOption } from "@/generated/api";
import { extractErrMsg } from "@/libs/utils";
import { useData } from "@/contexts/DataContext";

export default function Prints() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { currentUser } = useData();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const NumPerReq = 50;

  const [prints, setPrints] = useState<Print[]>([]);
  const fetchingRef = useRef(false);
  const offset = useRef(0);
  const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);

  const [preview, setPreview] = useState<{ idx: number; open: boolean }>({ idx: 0, open: false });
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  // prints, ...etc
  const fetchPrints = async () => {
    try {
      if (fetchingRef.current || offset.current < 0) return;
      fetchingRef.current = true;
      const res = await vrc.printsApi.getUserPrints({
        userId: currentUser.data?.id || "",
      }, {
        // API仕様にはないがoffsetとnを指定できるっぽい
        params: {
          offset: offset.current,
          n: NumPerReq,
          sort: SortOption.Updated,
          order: OrderOption.Descending,
        }
      });
      if (res.data.length === 0) {
        offset.current = -1; // reset offset if no more data
      } else {
        setPrints(prev => [...prev, ...res.data]);
        setPreviewImageUrls(prev => [...prev, ...res.data.map(print => print.files.image || "").filter(url => url.length > 0)]);
        offset.current += NumPerReq;
      }
    } catch (e) {
      showToast("error", "Error fetching own prints", extractErrMsg(e));
    } finally {
      fetchingRef.current = false;
    }
  };
  useEffect(() => {
    fetchPrints();
  }, []);
  const reload = () => {
    offset.current = 0;
    setPrints([]);
    setPreviewImageUrls([]);
    fetchPrints();
  };

  const renderItem = useCallback(({ item, index }: { item: Print; index: number }) => (
    <CardViewPrint print={item} style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]} onPress={() => setPreview({ idx: index, open: true })} />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>
        {t("pages.prints.no_prints")}
      </Text>
    </View>
  ), []);

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      <FlatList
        // key={`print-list-col-${cardViewColumns}`} // to re-render on column change
        data={prints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
        onEndReached={fetchPrints}
        onEndReachedThreshold={0.5}
        onRefresh={reload}
        refreshing={isLoading}
        contentContainerStyle={styles.scrollContentContainer}
      />

      {/* dialog and modals */}
      <ImagePreview imageUrls={previewImageUrls} initialIdx={preview.idx} open={preview.open} onClose={() => setPreview(prev => ({ ...prev, open: false }))} />
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
