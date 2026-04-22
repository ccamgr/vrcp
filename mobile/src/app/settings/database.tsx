// src/screens/Settings/database.tsx
import GenericScreen from "@/components/layout/GenericScreen";
import SettingItemList, { SettingItemListContents } from "@/components/features/settings/SettingItemList";
import GenericDialog from "@/components/layout/GenericDialog";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useCacheManager } from "@/hooks/useCacheManager";
import { formatBytes } from "@/lib/utils";

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

  // 汎用ダイアログ用のステート
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    message: "",
    onConfirm: () => { },
  });

  useEffect(() => {
    measureStateCache();
    measureDbCache();
    measureImageCache();
  }, [measureStateCache, measureDbCache, measureImageCache]);

  // ダイアログを呼び出して、OKが押されたらクリア処理を実行するラッパー
  const confirmClear = (title: string, clearFn: () => Promise<void>, setClearing: (v: boolean) => void) => {
    setDialogState({
      open: true,
      // i18nに対応。キーがない場合のフォールバックも用意
      message: t("pages.setting_database.dialog_confirm_clear", {
        cacheName: title
      }),
      onConfirm: async () => {
        setDialogState((prev) => ({ ...prev, open: false })); // ダイアログを閉じる
        setClearing(true); // 対象のローディングをON
        try {
          await clearFn();
          showToast("success", `${title} Cleared`);
        } catch (e) {
          showToast("error", "Error", String(e));
        } finally {
          setClearing(false); // ローディングをOFF
        }
      }
    });
  };

  const closeDialog = () => {
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  const listContents: SettingItemListContents = [
    {
      title: t("pages.setting_database.groupLabel_cache"),
      items: [
        {
          icon: "history",
          title: t("pages.setting_database.itemLabel_stateCache"),
          description: isClearingState
            ? t("common.loading", "Clearing...")
            : t("pages.setting_database.itemDescription_stateCache") + "\n" + (stateStats ? t("pages.setting_database.cache_size_and_count", {
              size: formatBytes(stateStats.size),
              count: stateStats.count
            }) : ""),
          onPress: () => confirmClear(
            t("pages.setting_database.itemLabel_stateCache"),
            clearStateCache,
            setIsClearingState
          ),
        },
        {
          icon: "database",
          title: t("pages.setting_database.itemLabel_dbCache"),
          description: isClearingDb
            ? t("common.loading", "Clearing...")
            : t("pages.setting_database.itemDescription_dbCache") + "\n" + (dbStats ? t("pages.setting_database.cache_size_and_count", {
              size: formatBytes(dbStats.size),
              count: dbStats.count
            }) : ""),
          onPress: () => confirmClear(
            t("pages.setting_database.itemLabel_dbCache"),
            clearDbCache,
            setIsClearingDb
          ),
        },
        {
          icon: "image-multiple",
          title: t("pages.setting_database.itemLabel_imageCache"),
          description: isClearingImage
            ? t("common.loading", "Clearing...")
            : t("pages.setting_database.itemDescription_imageCache"),
          onPress: () => confirmClear(
            t("pages.setting_database.itemLabel_imageCache"),
            clearImageCache,
            setIsClearingImage
          ),
        }
      ]
    }
  ];

  return (
    <GenericScreen scrollable>
      <SettingItemList contents={listContents} />

      <GenericDialog
        open={dialogState.open}
        message={dialogState.message}
        onConfirm={dialogState.onConfirm}
        onCancel={closeDialog}
        confirmTitle={t("common.clear", "Clear")}
        cancelTitle={t("common.cancel", "Cancel")}
        // キャッシュクリアのような破壊的アクションなので、目立つ色（赤系）を指定
        colorConfirm={theme.colors.notification}
      />
    </GenericScreen>
  );
}
