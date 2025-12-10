import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { getFriendRequestStatus } from "@/libs/vrchat";
import { User, UserStatus } from "@/vrchat/api";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, StyleSheet, View } from "react-native";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: User | undefined;
  onSuccess?: () => void;
}

const ChangeFriendModal = ({ open, setOpen, user, onSuccess }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const friReqStatus = user ? getFriendRequestStatus(user) : "null"; // "null" | "outgoing" | "completed"


  const handleSubmitChange = async () => {
    if (!user) return;
    if (isLoading) return;
    try {
      setIsLoading(true);
      if (friReqStatus === "completed") { // unfriend
        const res = await vrc.friendsApi.unfriend({
          userId: user.id,
        });
      } else if (friReqStatus === "outgoing") { // delete friend request
        const res = await vrc.friendsApi.deleteFriendRequest({
          userId: user.id,
        });
      } else if (friReqStatus === "null") { // send friend request
        const res = await vrc.friendsApi.friend({
          userId: user.id,
        });
      } 

      onSuccess?.();
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to update friend status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
  }, [open]);

  const getActionTitle = (user: User | undefined) => {
    if (user) {
      if (friReqStatus === "completed") return t("components.changeFriendModal.button_confirm_remove");
      if (friReqStatus === "outgoing") return t("components.changeFriendModal.button_confirm_cancel");
      if (friReqStatus === "null") return t("components.changeFriendModal.button_confirm_send");
    }
    return t("components.changeFriendModal.button_confirm_send");
  }
  const getActionColor = (user: User | undefined) => {
    if (user) {
      if (friReqStatus === "completed") return theme.colors.error;
      if (friReqStatus === "outgoing") return theme.colors.text;
      if (friReqStatus === "null") return theme.colors.primary;
    }
    return theme.colors.primary;
  }

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeFriendModal.button_cancel"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: getActionTitle(user),
      onPress: handleSubmitChange,
      color: getActionColor(user),
      flex: 1, 
    },
  ]
  return (
    <GenericModal buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>
      {isLoading && <LoadingIndicator absolute />}
      { user && (
        <View style={styles.container}>
          <Text style={[styles.text, {color: theme.colors.text}]}>
            {friReqStatus === "completed" && t("components.changeFriendModal.confirm_text_remove", { userName: user.displayName })}
            {friReqStatus === "outgoing" && t("components.changeFriendModal.confirm_text_cancel", { userName: user.displayName })}
            {friReqStatus === "null" && t("components.changeFriendModal.confirm_text_send", { userName: user.displayName })}
          </Text>
        </View>
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.large,
  },
  input: {
    borderRadius: radius.input,
  },
  text: {
    fontSize: fontSize.medium,
  }
  
});

export default ChangeFriendModal;
