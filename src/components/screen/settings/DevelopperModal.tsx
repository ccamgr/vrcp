import GenericModal from "@/components/layout/GenericModal";
import globalStyles, { spacing } from "@/config/styles";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import { navigate } from "expo-router/build/global-state/routing";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DevelopperModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const devInfo = {
    version: Constants.expoConfig?.version,
    expoSdkVersion: Constants.expoConfig?.sdkVersion,
    deviceName: Constants.deviceName,
    platform: Platform.OS,
    packageName: Platform.select({
      android: Constants.expoConfig?.android?.package,
      ios: Constants.expoConfig?.ios?.bundleIdentifier,
    }),
    expoBuildProfile: Constants.expoConfig?.extra?.vrcmm?.buildProfile,
    node_env: process.env.NODE_ENV,
  };

  const [cacheInfo, setCacheInfo] = useState<string>("");
  const getCacheInfo = async () => {
    FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "cache/").then(
      (files) => {
        setCacheInfo("caches:\n" + files.join(", ") || "No cache files");
      }
    );
  };

  useEffect(() => {
    if (!open) return;
    getCacheInfo();
  }, [open]);
  return (
    <GenericModal open={open} onClose={() => setOpen(false)}>
      <Text
        style={[
          globalStyles.header,
          globalStyles.headerContainer,
          { color: theme.colors.text },
        ]}
      >
        Developper Info
      </Text>

      <Text style={[globalStyles.text, { color: theme.colors.text }]}>
        {Object.entries(devInfo)
          .map(([key, value]) => `${key}:   ${value}`)
          .join("\n")}
      </Text>

      {Constants.expoConfig?.extra?.vrcmm.buildProfile === "development" && ( // only show in development build
        <View style={globalStyles.containerHorizontal}>
          <Text
            style={[globalStyles.text, { color: theme.colors.text, flex: 1 }]}
          >
            {cacheInfo}
          </Text>
          <Button
            style={[globalStyles.button, { marginTop: spacing.medium }]}
            color={theme.colors.primary}
            onPress={() => navigate("/_sitemap")}
          >
            [Sitemap]
          </Button>
        </View>
      )}

      <Button
        style={[
          globalStyles.button,
          { marginTop: spacing.medium, width: "100%" },
        ]}
        color={theme.colors.text}
        onPress={() => setOpen(false)}
      >
        close
      </Button>
    </GenericModal>
  );
};

export default DevelopperModal;
