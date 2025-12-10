import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { User, UserStatus } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: User | undefined;
  onSuccess?: () => void;
}

const ChangeNoteModal = ({ open, setOpen, user, onSuccess }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [note, setNote] = useState<string>(user?.note || "");

  const handleSubmitChange = async () => {
    if (!user) return;
    if (isLoading) return;
    try {
      setIsLoading(true);
      const res = await vrc.usersApi.updateUserNote({
        updateUserNoteRequest: { 
          targetUserId: user.id,
          note: note,
        },
      })
      onSuccess?.();
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to update note.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setNote(user?.note || "");
  }, [open]);

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeNoteModal.button_cancel"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: t("components.changeNoteModal.button_save"),
      onPress: handleSubmitChange,
      color: theme.colors.primary,
      flex: 1, 
    },
  ]
  return (
    <GenericModal buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>
      {isLoading && <LoadingIndicator absolute />}
      { user && (
        <View style={styles.container}>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            value={note}
            onChangeText={setNote}
            placeholder={t("components.changeNoteModal.placeholder")}
            multiline
            numberOfLines={10}
          />
        </View>
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

export default ChangeNoteModal;
