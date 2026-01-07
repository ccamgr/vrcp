import GenericModal from "@/components/layout/GenericModal";
import globalStyles, { spacing } from "@/configs/styles";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, View } from "react-native";
import LicenseModal from "./about_innermodals/LicenseModal";
import ChangeLogModal from "./about_innermodals/ChangeLogModal";
import { useTranslation } from "react-i18next";
import { ButtonEx, TouchableEx } from "@/components/CustomElements";
import { openBrowserAsync } from "expo-web-browser";
import { constants } from "@/configs/const";
import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import { getTintedColor } from "@/lib/utils";

interface AboutButtonItem {
  icon?: SupportedIconNames;
  title: string;
  onPress?: () => void;
}

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AboutModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ licenseModal, setLicenseModal ] = useState<boolean>(false);
  const [ changeLogModal, setChangeLogModal ] = useState<boolean>(false);

  const devInfo = {
    version: Constants.expoConfig?.version,
    expoSdkVersion: Constants.expoConfig?.sdkVersion,
    deviceName: Constants.deviceName,
    platform: Platform.OS,
    packageName: Platform.select({
      android: Constants.expoConfig?.android?.package,
      ios: Constants.expoConfig?.ios?.bundleIdentifier,
    }),
  };

  const buttonItems: AboutButtonItem[] = [
    {
      icon: "arrow-outward",
      title: t("components.aboutModal.button_termsOfUse"),
      onPress: () => openBrowserAsync(constants.externalLinks.terms_of_use),
    },
    {
      icon: "arrow-outward",
      title: t("components.aboutModal.button_privacyPolicy"),
      onPress: () => openBrowserAsync(constants.externalLinks.privacy_policy),
    },
    {
      title: t("components.aboutModal.button_Licenses"),
      onPress: () => setLicenseModal(true),
    },
    {
      title: t("components.aboutModal.button_ChangeLog"),
      onPress: () => setChangeLogModal(true),
    },
  ];

  return (
    <GenericModal
      title={t("components.aboutModal.label")}
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
    >

      <Text style={[globalStyles.text, { color: theme.colors.text }]}>
        {Object.entries(devInfo)
          .map(([key, value]) => `${key}:   ${value}`)
          .join("\n")}
      </Text>

      <View style={{ marginTop: spacing.medium, gap: spacing.small }} >
      {buttonItems.map((item, index) => (
        <View key={index}>
          <TouchableEx
            onPress={item.onPress}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              paddingVertical: spacing.small,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 8,
            }}
          >
            <Text style={[globalStyles.text, { fontSize: 16 }]}>{item.title}</Text>
            {item.icon && <IconSymbol name={item.icon} size={16} style={{ marginLeft: spacing.small }} />}
          </TouchableEx>
        </View>
      ))}
      </View>

      {/* Modal */}
      <LicenseModal
        open={licenseModal}
        setOpen={setLicenseModal}
      />
      <ChangeLogModal
        open={changeLogModal}
        setOpen={setChangeLogModal}
      />

    </GenericModal>
  );
};

export default AboutModal;
