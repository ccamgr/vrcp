import GenericDialog from "@/components/GenericDialog";
import GenericModal from "@/components/GenericModal";
import GenericScreen from "@/components/GenericScreen";
import IconSymbol from "@/components/icon-components/IconView";
import { SupportedIconNames } from "@/components/icon-components/utils";
import globalStyles, { fontSize, spacing } from "@/config/styles";
import useAuth from "@/contexts/AuthContext";
import { Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";


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
  const [openDevelopper, setOpenDevelopper] = useState(false);

  const devInfo = {
    version: Constants.expoConfig?.version,
    expoSdkVersion: Constants.expoConfig?.sdkVersion,
    deviceName: Constants.deviceName,
    platform : Platform.OS,
    packageName: Platform.select({
      android: Constants.expoConfig?.android?.package,
      ios: Constants.expoConfig?.ios?.bundleIdentifier,
    }),
    NODE_ENV: process.env.NODE_ENV,
  }
  const settingContents: Record<string, SettingItem[]> = {
    general: [
      {
        icon: "info",
        title: "Info",
        description: "View information about this app",
        onPress: () => {console.log("Info pressed")}
      },
      {
        icon: "view-list",
        title: "Database",
        description: "Manage your database",
        onPress: () => {}
      },
      {
        icon: "imagesearch-roller",
        title: "UI",
        description: "Manage your UI settings",
        onPress: () => {}
      }
    ],
    other: [
      {
        icon: "help",
        title: "Help",
        description: "Get help and support",
        onPress: () => {}
      },
      {
        icon: "bug",
        title: "developper",
        description: "Manage development features",
        onPress: () => setOpenDevelopper(true)
      },
    ],
    logout: [
      {
        icon: "logout",
        title: "Logout",
        description: "Log out from this app",
        onPress: () => setOpenLogout(true)
      }
    ]
  }

  return (
    <GenericScreen>
      {Object.entries(settingContents).map(([category, items]) => (
        <View key={category}>
          <Text style={[globalStyles.header, {color: theme.colors.text}]}>{category}</Text>
          {items.map((item, index) => (
            <TouchableOpacity key={index} style={[styles.listItemContainer, {borderBottomColor: theme.colors.border}]} onPress={item.onPress}>
              <IconSymbol name={item.icon} size={fontSize.large * 1.5} />
              <View style={styles.listItemLabel}>
                <Text style={[styles.listItemLabelTitleText, {color: theme.colors.text}]}>{item.title}</Text>
                <Text style={[styles.listItemLabelDescriptionText, {color: theme.colors.subText}]}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

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
  
      <GenericModal open={openDevelopper} onClose={() => setOpenDevelopper(false)}>
        <Text style={[globalStyles.header, {color: theme.colors.text}]}>Developper Info</Text>
        <Text style={[globalStyles.text, {color: theme.colors.text}]}>{JSON.stringify(devInfo, null, 2)}</Text>
        <Button
          style={[globalStyles.button, {marginTop: spacing.medium, width: "100%"}]}
          color={theme.colors.text}
          onPress={()=>setOpenDevelopper(false)}
        >
          close
        </Button>
      </GenericModal>
    
    </GenericScreen>
  );
}


const styles = StyleSheet.create({
  listItemContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 10,

    borderWidth: 1,
    borderStyle: "solid"
  },
  listItemLabel: {
    marginLeft: 10,
  },
  listItemButton: {
    marginTop: 8,
  },
  listItemLabelTitleText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  listItemLabelDescriptionText: {
    fontSize: 14,
  },
  dialogButtonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 4,
  },
})
