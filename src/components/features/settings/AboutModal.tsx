import GenericModal from "@/components/layout/GenericModal";
import globalStyles, { spacing } from "@/configs/styles";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, View } from "react-native";
import TermOfServiceModal from "./about_innermodals/TermOfServiceModal";
import PrivacyPolicyModal from "./about_innermodals/PrivacyPolicyModal";
import LicenseModal from "./about_innermodals/LicenseModal";
import ChangeLogModal from "./about_innermodals/ChangeLogModal";
import { useTranslation } from "react-i18next";


interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AboutModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ termOfServiceModal, setTermOfServiceModal ] = useState<boolean>(false);
  const [ privacyPolicyModal, setPrivacyPolicyModal ] = useState<boolean>(false);
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
    // expoBuildProfile: Constants.expoConfig?.extra?.vrcp?.buildProfile,
    // node_env: process.env.NODE_ENV,
  };

  const buttonItems = [
    {
      title: t("components.aboutModal.button_termOfService"),
      onPress: () => setTermOfServiceModal(true),
      flex: 1,
    },
    {
      title: t("components.aboutModal.button_privacyPolicy"),
      onPress: () => setPrivacyPolicyModal(true),
      flex: 1,
    },
    {
      title: t("components.aboutModal.button_Licenses"),
      onPress: () => setLicenseModal(true),
      flex: 1,
    },
    {
      title: t("components.aboutModal.button_ChangeLog"),
      onPress: () => setChangeLogModal(true),
      flex: 1,
    },
  ];

  return (
    <GenericModal
      title={t("components.aboutModal.title")}
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
      // buttonItems={buttonItems}
    >

      <Text style={[globalStyles.text, { color: theme.colors.text }]}>
        {Object.entries(devInfo)
          .map(([key, value]) => `${key}:   ${value}`)
          .join("\n")}
      </Text>

      <View style={{ marginTop: spacing.medium, gap: spacing.small }} >
      {buttonItems.map((item, index) => (
        <View key={index}>
          <Button onPress={item.onPress} >
            {item.title}
          </Button>
        </View>
      ))}
      </View>

      {/* Modal */}
      <TermOfServiceModal
        open={termOfServiceModal}
        setOpen={setTermOfServiceModal}
      />
      <PrivacyPolicyModal
        open={privacyPolicyModal}
        setOpen={setPrivacyPolicyModal}
      />
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
