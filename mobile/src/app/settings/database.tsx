// src/screens/Settings/database.tsx
import GenericScreen from "@/components/layout/GenericScreen";
import SettingItemList, { SettingItemListContents } from "@/components/features/settings/SettingItemList";
import GenericDialog from "@/components/layout/GenericDialog";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useCacheManager } from "@/hooks/useCacheManager";
import { useLogManager } from "@/hooks/useLogManager";
import { formatBytes } from "@/lib/utils";

export default function DatabaseSettings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Cache management hooks
  const {
    stateStats, measureStateCache, clearStateCache,
    dbStats, measureDbCache, clearDbCache,
    imageStats, measureImageCache, clearImageCache,
  } = useCacheManager();

  // Desktop log management hooks
  const { logStats, measureLogs, clearLogs } = useLogManager();

  const [isClearingState, setIsClearingState] = useState(false);
  const [isClearingDb, setIsClearingDb] = useState(false);
  const [isClearingImage, setIsClearingImage] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  // State for generic confirmation dialog
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
    // Measure all sizes on mount
    measureStateCache();
    measureDbCache();
    measureImageCache();
    measureLogs();
  }, [measureStateCache, measureDbCache, measureImageCache, measureLogs]);

  // Helper function to show confirmation and execute clear process
  const confirmClear = (title: string, clearFn: () => Promise<void>, setClearing: (v: boolean) => void, isDangerous: boolean = false) => {
    setDialogState({
      open: true,
      message: t(isDangerous ? "pages.setting_database.dialog_confirm_clear_danger" : "pages.setting_database.dialog_confirm_clear", {
        cacheName: title
      }),
      onConfirm: async () => {
        setDialogState((prev) => ({ ...prev, open: false }));
        setClearing(true);
        try {
          await clearFn();
          showToast("success", `${title} Cleared`);
        } catch (e) {
          showToast("error", "Error", String(e));
        } finally {
          setClearing(false);
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
    },
    {
      title: t("pages.setting_database.groupLabel_localData"),
      items: [
        {
          icon: "text-box-remove",
          title: t("pages.setting_database.itemLabel_desktopLogs"),
          description: isClearingLogs
            ? t("common.loading", "Clearing...")
            : t("pages.setting_database.itemDescription_desktopLogs") + "\n" + (logStats ? `Count: ${logStats.count}` : ""),
          onPress: () => confirmClear(
            t("pages.setting_database.itemLabel_desktopLogs"),
            clearLogs,
            setIsClearingLogs,
            true // isDangerous action, show different confirmation message
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
        // Use notification color (red-ish) for destructive actions
        colorConfirm={theme.colors.notification}
      />
    </GenericScreen>
  );
}
