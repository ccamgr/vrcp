import GenericScreen from "@/components/layout/GenericScreen";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, Switch } from "react-native";
import { useSetting } from "@/contexts/SettingContext";
import globalStyles, { spacing } from "@/configs/styles";

export default function NotificationsSettings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, saveSettings } = useSetting();

  // Helper to toggle types in the array
  const toggleNotificationType = (type: string) => {
    const currentTypes = settings.notificationOptions_allowedNotificationTypes;
    let newTypes;
    if (currentTypes.includes(type)) {
      newTypes = currentTypes.filter((t) => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }
    saveSettings({ notificationOptions_allowedNotificationTypes: newTypes });
  };

  return (
    <GenericScreen>
      <Text style={[globalStyles.subheader, { color: theme.colors.text }]}>
        {t("pages.setting_notifications.groupLabel_general", "General")}
      </Text>

      <View style={globalStyles.container}>
        <View style={styles.settingRow}>
          <View style={styles.textContainer}>
            <Text style={[globalStyles.text, { color: theme.colors.text }]}>
              {t("pages.setting_notifications.label_usePush", "Enable Local Notifications")}
            </Text>
            <Text style={[styles.description, { color: theme.colors.text, opacity: 0.7 }]}>
              {t("pages.setting_notifications.desc_usePush", "Notifications will only be delivered while the app is active in the foreground or background.")}
            </Text>
          </View>
          <Switch
            value={settings.notificationOptions_usePushNotification}
            onValueChange={(value) => saveSettings({ notificationOptions_usePushNotification: value })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </View>

      {/* Show detailed types only if main switch is ON */}
      {settings.notificationOptions_usePushNotification && (
        <>
          <Text style={[globalStyles.subheader, { color: theme.colors.text, marginTop: spacing.large }]}>
            {t("pages.setting_notifications.groupLabel_types", "Notification Types")}
          </Text>

          <View style={globalStyles.container}>
            {/* Friend Online */}
            <View style={styles.settingRow}>
              <Text style={[globalStyles.text, { color: theme.colors.text }]}>
                {t("pages.setting_notifications.type_friendOnline", "Friend Online")}
              </Text>
              <Switch
                value={settings.notificationOptions_allowedNotificationTypes.includes("friend-online")}
                onValueChange={() => toggleNotificationType("friend-online")}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>

            {/* Friend Location Change */}
            <View style={styles.settingRow}>
              <Text style={[globalStyles.text, { color: theme.colors.text }]}>
                {t("pages.setting_notifications.type_friendLocation", "Friend Location Change")}
              </Text>
              <Switch
                value={settings.notificationOptions_allowedNotificationTypes.includes("friend-location")}
                onValueChange={() => toggleNotificationType("friend-location")}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>

            {/* Invites */}
            <View style={styles.settingRow}>
              <Text style={[globalStyles.text, { color: theme.colors.text }]}>
                {t("pages.setting_notifications.type_invites", "Instance Invites")}
              </Text>
              <Switch
                value={settings.notificationOptions_allowedNotificationTypes.includes("invite")}
                onValueChange={() => toggleNotificationType("invite")}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
          </View>
        </>
      )}
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.medium,
  },
  description: {
    fontSize: 12,
    marginTop: spacing.mini,
  },
});
