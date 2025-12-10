import GenericModal from "@/components/layout/GenericModal";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, spacing } from "@/configs/styles";
import { useCache } from "@/contexts/CacheContext";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";


// term of service



interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PrivacyPolicyModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <GenericModal
      title={t("components.aboutModal.innerModals.privacyPolicy.title")}
      showCloseButton
      size="full"
      open={open}
      onClose={() => setOpen(false)}
    >
      <Text style={[styles.text, { color: theme.colors.text }]}>
        {'そんな\nものは\nない!!'}
      </Text>
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  cacheContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    textAlign: "center",
    fontSize: fontSize.large * 5
  }
});

export default PrivacyPolicyModal;
