// src/screens/Settings/database.tsx (パスはプロジェクトに合わせてください)
import { ButtonEx } from "@/components/CustomElements";
import GenericScreen from "@/components/layout/GenericScreen";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { spacing } from "@/configs/styles";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useToast } from "@/contexts/ToastContext";
import { useCacheManager, CacheStats } from "@/hooks/useCacheManager";

export default function DatabaseSettings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const {
    stateStats, measureStateCache, clearStateCache,
    dbStats, measureDbCache, clearDbCache,
    imageStats, measureImageCache, clearImageCache,
  } = useCacheManager();

  const [isClearingState, setIsClearingState] = useState(false);
  const [isClearingDb, setIsClearingDb] = useState(false);
  const [isClearingImage, setIsClearingImage] = useState(false);

  useEffect(() => {
    measureStateCache();
    measureDbCache();
    measureImageCache();
  }, [measureStateCache, measureDbCache, measureImageCache]);

  // 各セクションを描画するためのヘルパーコンポーネント
  const CacheRow = ({
    title,
    stats,
    isClearing,
    onClear,
    showStats = true
  }: {
    title: string;
    stats?: CacheStats;
    isClearing: boolean;
    onClear: () => Promise<void>;
    showStats?: boolean;
  }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={styles.cacheContainer}>
        {isClearing || !stats ? (
          <LoadingIndicator size={24} notext />
        ) : showStats && stats.count >= 0 ? (
          <Text style={[globalStyles.text, { color: theme.colors.text, flex: 1 }]}>
            {t("pages.setting_database.cache_size_and_count", {
              size: (stats.size / (1024 * 1024)).toFixed(2), // バイトをMBに変換
              count: stats.count,
            })}
          </Text>
        ) : null}
        <ButtonEx
          style={[globalStyles.button, { marginLeft: spacing.medium }]}
          color={theme.colors.text}
          onPress={async () => {
            try {
              await onClear();
              showToast("success", `${title} Cleared`);
            } catch (e) {
              showToast("error", "Error", String(e));
            }
          }}
          disabled={isClearing}
        >
          {t("pages.setting_database.button_clearCache")}
        </ButtonEx>
      </View>
    </View>
  );

  return (
    <GenericScreen>
      <Text style={[globalStyles.subheader, { color: theme.colors.text }]}>
        {t("pages.setting_database.label")}
      </Text>

      <View style={globalStyles.container}>
        <CacheRow
          title="State Cache (Friends, Feeds)"
          stats={stateStats}
          isClearing={isClearingState}
          onClear={async () => {
            setIsClearingState(true);
            await clearStateCache();
            setIsClearingState(false);
          }}
        />

        <CacheRow
          title="Database Cache (Avatars, Worlds)"
          stats={dbStats}
          isClearing={isClearingDb}
          onClear={async () => {
            setIsClearingDb(true);
            await clearDbCache();
            setIsClearingDb(false);
          }}
        />

        <CacheRow
          title="Image Cache (Thumbnails)"
          stats={imageStats}
          isClearing={isClearingImage}
          onClear={async () => {
            setIsClearingImage(true);
            await clearImageCache();
            setIsClearingImage(false);
          }}
          showStats={false} // 画像キャッシュはネイティブ管理のため詳細サイズを表示しない
        />
      </View>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.large,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: spacing.small,
    opacity: 0.8,
  },
  cacheContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(150,150,150,0.1)", // 少し背景を付けて区別
    padding: spacing.medium,
    borderRadius: 8,
  },
});
