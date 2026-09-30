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
import { useLocalSearchParams } from "expo-router";
import CardViewPrint from "@/components/view/item-CardView/CardViewPrint";
import { navigationBarHeight, spacing } from "@/configs/styles";
import ImagePreview from "@/components/view/ImagePreview";
import { FlatList } from "react-native-gesture-handler";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { OrderOption, Print, SortOption } from "@/generated/vrcapi";
import { extractErrMsg } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/vrc/useCurrentUser";

export default function Prints() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions_cardViewColumns;
  const NumPerReq = 50;

  const [prints, setPrints] = useState<Print[]>([]);
  const fetchingRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const requestGenerationRef = useRef(0);
  const offset = useRef(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [preview, setPreview] = useState<{ idx: number; open: boolean }>({
    idx: 0,
    open: false,
  });
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  // prints, ...etc
  const fetchPrints = useCallback(async (generation = requestGenerationRef.current) => {
    const userId = currentUser?.id;
    if (!userId || fetchingRef.current || offset.current < 0) return;

    const request = (async () => {
      fetchingRef.current = true;
      try {
        const requestOffset = offset.current;
        const res = await vrc.printsApi.getUserPrints(
          {
            userId,
          },
          {
            params: {
              offset: requestOffset,
              n: NumPerReq,
              sort: SortOption.Updated,
              order: OrderOption.Descending,
            },
          },
        );
        if (generation !== requestGenerationRef.current) return;

        if (res.data.length === 0) {
          offset.current = -1;
        } else {
          setPrints((prev) => [...prev, ...res.data]);
          setPreviewImageUrls((prev) => [
            ...prev,
            ...res.data
              .map((print) => print.files.image || "")
              .filter((url) => url.length > 0),
          ]);
          offset.current = requestOffset + NumPerReq;
        }
      } catch (error) {
        if (generation === requestGenerationRef.current) {
          showToast("error", "Error fetching own prints", extractErrMsg(error));
        }
      } finally {
        fetchingRef.current = false;
      }
    })();

    inFlightRef.current = request;
    try {
      await request;
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
    }
  }, [currentUser?.id, showToast, vrc.printsApi]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const generation = ++requestGenerationRef.current;
    offset.current = 0;
    setPrints([]);
    setPreviewImageUrls([]);
    void fetchPrints(generation).finally(() => setIsInitialLoading(false));
  }, [currentUser?.id, fetchPrints]);

  const reload = async () => {
    if (isRefreshing) return;

    const generation = ++requestGenerationRef.current;
    offset.current = 0;
    setPrints([]);
    setPreviewImageUrls([]);
    setIsRefreshing(true);
    try {
      await inFlightRef.current;
      await fetchPrints(generation);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Print; index: number }) => (
      <CardViewPrint
        print={item}
        style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
        onPress={() => setPreview({ idx: index, open: true })}
      />
    ),
    [],
  );
  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.prints.no_prints")}
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
        // key={`print-list-col-${cardViewColumns}`} // to re-render on column change
        data={prints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={cardViewColumns}
        onEndReached={() => void fetchPrints()}
        onEndReachedThreshold={0.5}
        onRefresh={reload}
        refreshing={isRefreshing}
        contentContainerStyle={styles.scrollContentContainer}
      />

      {/* dialog and modals */}
      <ImagePreview
        imageUrls={previewImageUrls}
        initialIdx={preview.idx}
        open={preview.open}
        onClose={() => setPreview((prev) => ({ ...prev, open: false }))}
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
