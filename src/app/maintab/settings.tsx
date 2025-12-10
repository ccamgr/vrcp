import GenericDialog from "@/components/layout/GenericDialog";
import GenericScreen from "@/components/layout/GenericScreen";
import DatabaseModal from "@/components/features/settings/DatabaseModal";
import DevelopmentModal from "@/components/features/settings/DevelopmentModal";
import UIModal from "@/components/features/settings/UIModal";
import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import globalStyles, { fontSize, spacing } from "@/configs/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { navigate } from "expo-router/build/global-state/routing";
import AboutModal from "@/components/features/settings/AboutModal";
import { ScrollView } from "react-native-gesture-handler";
import FeedbackModal from "@/components/features/settings/FeedbackModal";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";
import NotificationModal from "@/components/features/settings/NotificationModal";

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
  const [openDatabase, setOpenDatabase] = useState(false);
  const [openUI, setOpenUI] = useState(false);
  const [openNotification, setOpenNotification] = useState(false);

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
          title: t("pages.settings.itemLabel_ui"),
          description: t("pages.settings.itemDescription_ui"),
          onPress: () => setOpenUI(true),
        },
        {
          icon: "view-list",
          title: t("pages.settings.itemLabel_database"),
          description: t("pages.settings.itemDescription_database"),
          onPress: () => setOpenDatabase(true),
        },
        {
          icon: "notifications",
          title: t("pages.settings.itemLabel_notifications"),
          description: t("pages.settings.itemDescription_notifications"),
          onPress: () => setOpenNotification(true),
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
      <ScrollView>
      {settingContents.map((categoryGroup) => (
        <View key={categoryGroup.title} style={styles.categoryContainer}>
          <Text style={[globalStyles.header, { color: theme.colors.text }]}>
            {categoryGroup.title}
          </Text>
          {categoryGroup.items.map((item, index) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={index}
              style={[
                styles.listItemContainer,
                { borderBottomColor: theme.colors.border },
              ]}
              onPress={item.onPress}
            >
              <IconSymbol name={item.icon} color={item.iconColor} size={fontSize.large * 1.5} />
              <View style={styles.listItemLabel}>
                <Text
                  style={[globalStyles.subheader, { color: theme.colors.text }]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[globalStyles.text, { color: theme.colors.subText }]}
                >
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      </ScrollView>


      {/* dialog and modals */}
      <GenericDialog
        open={openLogout}
        message="Are you sure you want to log out?"
        onConfirm={() => {
          auth.logout();
          setOpenLogout(false);
        }}
        onCancel={() => setOpenLogout(false)}
        colorConfirm={theme.colors.error}
        confirmTitle="Logout"
        cancelTitle="Cancel"
      />
      <DatabaseModal open={openDatabase} setOpen={setOpenDatabase} />
      <UIModal open={openUI} setOpen={setOpenUI} />
      <DevelopmentModal open={openDevelopment} setOpen={setOpenDevelopment} />
      <AboutModal open={openAbout} setOpen={setOpenAbout} />
      <FeedbackModal open={openFeedback} setOpen={setOpenFeedback} />
      <NotificationModal open={openNotification} setOpen={setOpenNotification} />

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
