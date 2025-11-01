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
import InfoModal from "@/components/features/settings/InfoModal";
import { ScrollView } from "react-native-gesture-handler";
import FeedbackModal from "@/components/features/settings/FeedbackModal";

interface SettingItem {
  icon: SupportedIconNames;
  title: string;
  description: string;
  onPress: () => void;
}

export default function Settings() {
  const auth = useAuth();
  const theme = useTheme();
  const [openLogout, setOpenLogout] = useState(false);
  const [openDevelopment, setOpenDevelopment] = useState(false);
  const [openFeedback, setOpenFeedback] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [openDatabase, setOpenDatabase] = useState(false);
  const [openUI, setOpenUI] = useState(false);

  const settingContents: Record<string, SettingItem[]> = {
    general: [
      {
        icon: "imagesearch-roller",
        title: "UI",
        description: "Manage your UI settings",
        onPress: () => setOpenUI(true),
      },
      {
        icon: "view-list",
        title: "Database",
        description: "Manage your database",
        onPress: () => setOpenDatabase(true),
      },
      {
        icon: "notifications",
        title: "Notifications",
        description: "Manage Push Notifications",
        onPress: () => {},
      },
    ],
    other: [
      {
        icon: "information",
        title: "Information",
        description: "View information about this app",
        onPress: () => setOpenInfo(true),
      },
      {
        icon: "code-not-equal-variant",
        title: "Development",
        description: "Manage development features",
        onPress: () => setOpenDevelopment(true),
      },
      {
        icon: "message-alert",
        title: "Feedback",
        description: "send your feedback to developer",
        onPress: () => setOpenFeedback(true),
      },
      ...(Constants.expoConfig?.extra?.vrcmm.buildProfile == "development" ? [
        {
          icon: "routes" as SupportedIconNames,
          title: "sitemap",
          description: "(only in development mode)",
          onPress: () => router.push("/_sitemap"),
        }
      ] : []),
    ],
    logout: [
      {
        icon: "logout",
        title: "Logout",
        description: "Log out from this app",
        onPress: () => setOpenLogout(true),
      },
    ],
  };

  return (
    <GenericScreen scrollable>
      <ScrollView>
      {Object.entries(settingContents).map(([category, items]) => (
        <View key={category} style={styles.categoryContainer}>
          <Text style={[globalStyles.header, { color: theme.colors.text }]}>
            {category}
          </Text>
          {items.map((item, index) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={index}
              style={[
                styles.listItemContainer,
                { borderBottomColor: theme.colors.border },
              ]}
              onPress={item.onPress}
            >
              <IconSymbol name={item.icon} size={fontSize.large * 1.5} />
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
      <InfoModal open={openInfo} setOpen={setOpenInfo} />
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
