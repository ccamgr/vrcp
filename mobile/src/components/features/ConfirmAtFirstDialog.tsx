import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import IconSymbol from "@/components/view/icon-components/IconView";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { getStatusColor } from "@/libs/vrchat";
import { UserStatus } from "@/generated/vrcapi";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import AsyncStorage from "expo-sqlite/kv-store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

const CONFIRMED_KEY = "confirmed_at_first_v1";

const ConfirmAtFirstDialog = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const checkConfirmed = async () => {
      try {
        const value = await AsyncStorage.getItem(CONFIRMED_KEY);
        if (value !== "true") {
          setOpen(true);
        }
      } catch (error) {
        showToast("error", "Failed to check confirmation status.");
        setOpen(true);
      }
    }
    checkConfirmed();
  }, []);

  const handleConfirm = async () => {
    try {
      await AsyncStorage.setItem(CONFIRMED_KEY, "true");
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to save confirmation status.");
    }
  }

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: "CONFIRM",
      onPress: handleConfirm,
      color: theme.colors.primary,
    },
  ]
  return (
    <GenericModal
      closeOnOutside={false}
      showCloseButton={false}
      buttonItems={footerButtons}
      open={open}
      // onClose={() => {}}
    >
      <View style={styles.container}>

      </View>
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
  },
});

export default ConfirmAtFirstDialog;
