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
import { TouchableEx } from "@/components/CustomElements";
import { Text, View, StyleSheet, ActivityIndicator } from "react-native";

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

  // Step 1 State (For Desktop Logs only)
  const [actionMenuState, setActionMenuState] = useState<{
    open: boolean;
    title: string;
    stats: string;
    onProceed: () => void;
  }>({
    open: false,
    title: "",
    stats: "",
    onProceed: () => { },
  });

  // Step 2 State (Final Confirmation)
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
    measureLogs();
  }, [measureStateCache, measureDbCache, measureImageCache, measureLogs]);

  // Handler for Desktop Logs (Two-step)
  const openActionMenu = (
    title: string,
    stats: string,
    clearFn: () => Promise<void>,
    setClearing: (v: boolean) => void,
    isDangerous: boolean = false
  ) => {
    setActionMenuState({
      open: true,
      title,
      stats,
      onProceed: () => {
        setActionMenuState((prev) => ({ ...prev, open: false }));
        setTimeout(() => {
          confirmClear(title, clearFn, setClearing, isDangerous);
        }, 350);
      }
    });
  };

  // Handler for Final Clear
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

  // Render clear button (Inherit theme colors)
  const renderClearButton = (onPress: () => void, isLoading: boolean) => (
    <TouchableEx
      style={[styles.clearButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.text} />
      ) : (
        <Text style={[styles.clearButtonText, { color: theme.colors.text }]}>
          {t("pages.setting_database.button_clear", "Clear")}
        </Text>
      )}
    </TouchableEx>
  );

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
          leading: renderClearButton(
            () => confirmClear(t("pages.setting_database.itemLabel_stateCache"), clearStateCache, setIsClearingState, false),
            isClearingState
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
          leading: renderClearButton(
            () => confirmClear(t("pages.setting_database.itemLabel_dbCache"), clearDbCache, setIsClearingDb, false),
            isClearingDb
          ),
        },
        {
          icon: "image-multiple",
          title: t("pages.setting_database.itemLabel_imageCache"),
          description: isClearingImage
            ? t("common.loading", "Clearing...")
            : t("pages.setting_database.itemDescription_imageCache"),
          leading: renderClearButton(
            () => confirmClear(t("pages.setting_database.itemLabel_imageCache"), clearImageCache, setIsClearingImage, false),
            isClearingImage
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
          // Tap the whole field for logs
          onPress: () => openActionMenu(
            t("pages.setting_database.itemLabel_desktopLogs"),
            logStats ? `Count: ${logStats.count}` : "",
            clearLogs,
            setIsClearingLogs,
            true
          ),
        }
      ]
    }
  ];

  return (
    <GenericScreen scrollable>
      <SettingItemList contents={listContents} />

      {/* desktop logs dialog */}
      <GenericDialog
        open={actionMenuState.open}
        message={`【${actionMenuState.title}】\n\n${actionMenuState.stats}`}
        onConfirm={actionMenuState.onProceed}
        onCancel={() => setActionMenuState((prev) => ({ ...prev, open: false }))}
        confirmTitle={t("pages.setting_database.button_clear", "Clear")}
        cancelTitle={t("common.cancel", "Cancel")}
        colorConfirm={theme.colors.primary}
      />

      {/* Final confirmation dialog (for all actions) */}
      <GenericDialog
        open={dialogState.open}
        message={dialogState.message}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState((prev) => ({ ...prev, open: false }))}
        confirmTitle={t("pages.setting_database.button_clear", "Clear")}
        cancelTitle={t("common.cancel", "Cancel")}
        colorConfirm={theme.colors.notification}
      />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8, // Adjust spacing as leading element
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
