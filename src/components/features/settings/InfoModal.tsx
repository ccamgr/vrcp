import GenericModal from "@/components/layout/GenericModal";
import globalStyles, { spacing } from "@/configs/styles";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, View } from "react-native";
import TermOfServiceModal from "./info_innermodals/TermOfServiceModal";
import PrivacyPolicyModal from "./info_innermodals/PrivacyPolicyModal";


interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const InfoModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const [ termOfServiceModal, setTermOfServiceModal ] = useState<boolean>(false);
  const [ privacyPolicyModal, setPrivacyPolicyModal ] = useState<boolean>(false);

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

  const buttonItems = [
    {
      title: "Terms of Service",
      onPress: () => setTermOfServiceModal(true),
      flex: 1,
    },
    {
      title: "Privacy Policy",
      onPress: () => setPrivacyPolicyModal(true),
      flex: 1,
    },
  ];

  return (
    <GenericModal
      title="App Information"
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
      buttonItems={buttonItems}
    >

      <Text style={[globalStyles.text, { color: theme.colors.text }]}>
        {Object.entries(devInfo)
          .map(([key, value]) => `${key}:   ${value}`)
          .join("\n")}
      </Text>

      {/* Modal */}
      <TermOfServiceModal
        open={termOfServiceModal}
        setOpen={setTermOfServiceModal}
      />
      <PrivacyPolicyModal
        open={privacyPolicyModal}
        setOpen={setPrivacyPolicyModal}
      />

    </GenericModal>
  );
};

export default InfoModal;
