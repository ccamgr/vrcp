import GenericModal from "@/components/layout/GenericModal";
import { TouchableOpacity } from "@/components/CustomElements";
import { ButtonItemForFooter } from "@/components/layout/type";
import IconSymbol from "@/components/view/icon-components/IconView";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { getStatusColor } from "@/libs/vrchat";
import { UserStatus } from "@/vrchat/api";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ChangeStatusModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { currentUser } = useData();
  const [isLoading, setIsLoading] = useState(false);

  const [statusDescription, setStatusDescription] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(UserStatus.Offline);


  const statusOptions = [
    UserStatus.JoinMe,
    UserStatus.Active,
    UserStatus.AskMe,
    UserStatus.Busy,
    // UserStatus.Offline
  ]
  const handleSubmitChange = async () => {
    if (!currentUser.data) return;
    if (isLoading) return;
    try {
      setIsLoading(true);
      const res = await vrc.usersApi.updateUser({
        userId: currentUser.data.id,
        updateUserRequest: {
          status: selectedStatus,
          statusDescription: statusDescription,
        },
      });
      currentUser.fetch();
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to update status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelectedStatus(currentUser.data?.status || "offline");
    setStatusDescription(currentUser.data?.statusDescription || "");
  }, [open]);

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeStatusModal.button_cancel"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: t("components.changeStatusModal.button_save"),
      onPress: handleSubmitChange,
      color: theme.colors.primary,
      flex: 1, 
    },
  ]
  return (
    <GenericModal buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>
      {isLoading && <LoadingIndicator absolute />}
      { currentUser.data && (
        <View style={styles.container}>
          <View style={styles.statusOptionAreaContainer}>
            {statusOptions.map(status => (
              <TouchableOpacity 
                key={`status_option_${status}`}
                style={[styles.statusOptionItem, selectedStatus === status && { borderColor: theme.colors.primary}]} 
                onPress={() => setSelectedStatus(status)}
              >
                <IconSymbol name="circle" size={12} color={getStatusColor(status)} style={{ marginRight: spacing.mini }} />
                <Text style={{ fontWeight: selectedStatus === status ? "bold" : "normal" }}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.descriptionAreaContainer}>
            <TextInput
              style={[styles.descriptionInput, { color: theme.colors.text, borderColor: theme.colors.subText}]}
              value={statusDescription}
              onChange={e => setStatusDescription(e.nativeEvent.text)}
              // autoFocus
              placeholder={t("components.changeStatusModal.placeholder")}

            />
            <FlatList 
              style={styles.descriptionHistory}
              data={currentUser.data.statusHistory}
              keyExtractor={(_, index) => `status_history_${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setStatusDescription(item)} style={styles.descriptionHistoryItem}>
                  <Text style={styles.descriptionHistoryItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text style={[globalStyles.text, { fontStyle: "italic", color: theme.colors.subText }]}>No status history</Text>
              )}
              contentContainerStyle={styles.descriptionHistorylistInner}
            />
          </View>
        </View>
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    gap: spacing.medium,
  },
  
  statusOptionAreaContainer: {
    width: "30%",
    gap: spacing.medium,
    // borderStyle:"dotted", borderColor:"blue",borderWidth:1
  },
  statusOptionItem: { 
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.small,
    borderWidth: 2, 
    borderRadius: radius.button,
    borderColor: "transparent", 
  },
  descriptionAreaContainer: {
    height: (fontSize.medium + 4 * spacing.small) * 5, // 5 lines
    flex: 1,
    // borderStyle:"dotted", borderColor:"blue",borderWidth:1
  },
  descriptionInput: {
    fontSize: fontSize.medium,
    paddingLeft: spacing.small,
    paddingRight: spacing.small,
    paddingBottom: spacing.small,
    paddingTop: spacing.small,
    borderWidth: 1,
    borderRadius: radius.input,
  },
  descriptionHistory: {
    marginTop: spacing.small,
  },
  descriptionHistorylistInner: {
    gap: spacing.small,
  },
  descriptionHistoryItem: {
    paddingHorizontal: spacing.small,
  },
  descriptionHistoryItemText: {
    fontSize: fontSize.medium,
  }
});

export default ChangeStatusModal;
