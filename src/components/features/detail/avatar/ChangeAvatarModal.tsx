import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { Avatar } from "@/vrchat/api";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  avatar: Avatar | undefined;
  onSuccess?: () => void;
}

const ChangeAvatarModal = ({ open, setOpen, avatar, onSuccess }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const vrc = useVRChat();
  const { showToast } = useToast();
  const { currentUser } = useData();
  const [isLoading, setIsLoading] = useState(false);


  const handleChangeAvatar = async () => {
    if (!avatar) return;
    if (isLoading) return;
    if (currentUser.data?.currentAvatar === avatar.id) {
      setOpen(false);
      showToast("info", "You are already using this avatar.");
      return;
    }
    try {
      setIsLoading(true);
      const res = await vrc.avatarsApi.selectAvatar({
        avatarId: avatar.id,
      })
      onSuccess?.();
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to change avatar.");
    } finally {
      setIsLoading(false);
    }
  };

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeAvatarModal.button_cancel"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: t("components.changeAvatarModal.button_confirm"),
      onPress: handleChangeAvatar,
      color: theme.colors.primary,
      flex: 1, 
    },
  ]
  return (
    <GenericModal buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>
      {isLoading && <LoadingIndicator absolute />}
      { avatar && (
        <Text style={[globalStyles.text, { fontSize: fontSize.medium }]}>
          {t("components.changeAvatarModal.confirm_text", { avatarName: avatar.name })}
        </Text>
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  input: {
    borderRadius: radius.input,
  },
  
});

export default ChangeAvatarModal;
