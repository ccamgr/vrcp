import GenericDialog from "@/components/layout/GenericDialog";
import GenericScreen from "@/components/layout/GenericScreen";
import DevelopmentModal from "@/components/features/settings/DevelopmentModal";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import globalStyles, { fontSize, spacing } from "@/configs/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AboutModal from "@/components/features/settings/AboutModal";
import FeedbackModal from "@/components/features/settings/FeedbackModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import { routeToAppearanceSettings, routeToDatabaseSettings, routeToDesktopAppSettings, routeToLanguageSettings, routeToNotificationSettings } from "@/libs/route";
import SettingItemList from "@/components/features/settings/SettingItemList";
import { useSetting } from "@/contexts/SettingContext";

interface SettingItem {
  icon: SupportedIconNames;
  title: string;
  description: string;
  onPress: () => void;
  iconColor?: string;
}

export default function Settings() {
  const auth = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();
  const [openLogout, setOpenLogout] = useState(false);
  const [openDevelopment, setOpenDevelopment] = useState(false);
  const [openFeedback, setOpenFeedback] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);

  const { showToast } = useToast();

  const settingContents: {
    title: string;
    items: SettingItem[];
  }[] = [
      {
        title: t("pages.settings.groupLabel_general"),
        items: [
          {
            icon: "imagesearch-roller",
            title: t("pages.settings.itemLabel_appearance"),
            description: t("pages.settings.itemDescription_appearance"),
            onPress: () => routeToAppearanceSettings(),
          },
          {
            icon: "view-list",
            title: t("pages.settings.itemLabel_database"),
            description: t("pages.settings.itemDescription_database"),
            onPress: () => routeToDatabaseSettings(),
          },
          {
            icon: "notifications",
            title: t("pages.settings.itemLabel_notifications"),
            description: t("pages.settings.itemDescription_notifications"),
            onPress: () => routeToNotificationSettings(),
          },
          {
            icon: "desktop-mac",
            title: t("pages.settings.itemLabel_desktopapp"),
            description: t("pages.settings.itemDescription_desktopapp"),
            onPress: () => routeToDesktopAppSettings(),
          },
          {
            icon: "language",
            title: t("pages.settings.itemLabel_language"),
            description: t("pages.settings.itemDescription_language"),
            onPress: () => routeToLanguageSettings(),
          },
        ],
      },
      {
        title: t("pages.settings.groupLabel_other"),
        items: [
          {
            icon: "information",
            title: t("pages.settings.itemLabel_about"),
            description: t("pages.settings.itemDescription_about"),
            onPress: () => setOpenAbout(true),
          },
          {
            icon: "code-not-equal-variant",
            title: t("pages.settings.itemLabel_development"),
            description: t("pages.settings.itemDescription_development"),
            onPress: () => setOpenDevelopment(true),
          },
          {
            icon: "message-alert",
            title: t("pages.settings.itemLabel_feedback"),
            description: t("pages.settings.itemDescription_feedback"),
            onPress: () => setOpenFeedback(true),
          },
        ],
      },
      {
        title: t("pages.settings.groupLabel_account"),
        items: [
          {
            icon: "logout",
            title: t("pages.settings.itemLabel_logout"),
            description: t("pages.settings.itemDescription_logout"),
            onPress: () => setOpenLogout(true),
            iconColor: theme.colors.error,
          },
        ],
      },
    ];

  return (
    <GenericScreen scrollable>
      <SettingItemList contents={settingContents} />


      {/* dialog and modals */}
      <GenericDialog
        open={openLogout}
        message={t("pages.settings.logout_dialog_text")}
        onConfirm={() => {
          auth.logout();
          setOpenLogout(false);
        }}
        onCancel={() => setOpenLogout(false)}
        colorConfirm={theme.colors.error}
        confirmTitle={t("pages.settings.logout_dialog_confirm")}
        cancelTitle={t("pages.settings.logout_dialog_cancel")}
      />
      <DevelopmentModal open={openDevelopment} setOpen={setOpenDevelopment} />
      <AboutModal open={openAbout} setOpen={setOpenAbout} />
      <FeedbackModal open={openFeedback} setOpen={setOpenFeedback} />

    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  categoryContainer: {
    padding: spacing.medium,
  },
  listItemContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: spacing.medium,

    borderWidth: 1,
    borderStyle: "solid",
  },
  listItemLabel: {
    marginLeft: spacing.medium,
  },
});
