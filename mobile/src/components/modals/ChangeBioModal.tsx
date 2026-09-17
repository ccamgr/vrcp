import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import IconSymbol from "@/components/view/icon-components/IconView";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { getStatusColor } from "@/lib/vrchat";
import { UserStatus } from "@/generated/vrcapi";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { useCurrentUser } from "@/hooks/vrc/useCurrentUser";
import { usePublicProfile } from "@/hooks/vrc/usePublicProfile";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ChangeBioModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentUser = useCurrentUser();
  const publicProfile = usePublicProfile(currentUser.data?.id, true);
  const [isLoading, setIsLoading] = useState(false);

  const [bio, setBio] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const handleSubmitChange = async () => {
    if (!currentUser.data) return;
    if (isLoading) return;
    try {
      setIsLoading(true);
      const res = await vrc.usersApi.updateProfile({
        userId: currentUser.data.id,
        updateProfileRequest: {
          bio: bio,
        },
      });
      publicProfile.setProfile(res.data);
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to update bio.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setIsDirty(false);
      return;
    }
    if (isDirty || !publicProfile.data) return;
    setBio(publicProfile.data?.bio ?? "");
  }, [open, isDirty, publicProfile.data]);

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeBioModal.button_cancel"),
      onPress: () => setOpen(false),
      color: theme.colors.text,
    },
    {
      title: t("components.changeBioModal.button_save"),
      onPress: handleSubmitChange,
      color: theme.colors.primary,
      flex: 1,
    },
  ];
  return (
    <GenericModal
      buttonItems={footerButtons}
      open={open}
      onClose={() => setOpen(false)}
    >
      {isLoading && <LoadingIndicator absolute />}
      {currentUser.data && (
        <View style={styles.container}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            value={bio}
            onChangeText={(value) => {
              setIsDirty(true);
              setBio(value);
            }}
            placeholder={t("components.changeBioModal.placeholder")}
            multiline
            numberOfLines={10}
          />
        </View>
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {},
  input: {
    borderRadius: radius.input,
  },
});

export default ChangeBioModal;
