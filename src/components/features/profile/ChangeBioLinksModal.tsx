import GenericModal from "@/components/layout/GenericModal";
import { TouchableOpacity } from "@/components/CustomElements";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { TextInput } from "react-native-gesture-handler";
import DraggableFlatListItem from "@/components/view/DraggableFlatListItem";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}
 
const ChangeBioLinksModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { currentUser } = useData();
  const [isLoading, setIsLoading] = useState(false);

  const [bioLinks, setBioLinks] = useState<string[]>([]);

  const handleSubmitChange = async () => {
    if (!currentUser.data) return;
    if (isLoading) return;
    try {
      setIsLoading(true);
      const res = await vrc.usersApi.updateUser({
        userId: currentUser.data.id,
        updateUserRequest: {
          bioLinks: bioLinks,
        },
      });
      currentUser.fetch();
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to update bio links.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setBioLinks(currentUser.data?.bioLinks || []);
  }, [open]);

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeBioLinksModal.button_cancel"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: t("components.changeBioLinksModal.button_save"),
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
          <TextInput
            style={[globalStyles.input, styles.input, {backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border}]}
            defaultValue=""
            placeholder={t("components.changeBioLinksModal.placeholder")}
            placeholderTextColor={theme.colors.text + "99"}
            editable={!isLoading}
            onSubmitEditing={(e) => {
              const text = e.nativeEvent.text;
              if (text.trim() === "") return;
              setBioLinks([...bioLinks, text.trim()]);
            }}
          />
          <DraggableFlatList
            style={styles.draggableList} 
            data={bioLinks}
            onDragEnd={({ data }) => setBioLinks(data)}
            keyExtractor={(item, index) => `draggable-item-${index}-${item}`}
            renderItem={({ item, drag, isActive, getIndex }) => (
              <DraggableFlatListItem
                item={item}
                drag={drag}
                isActive={isActive}
                allowInput={true}
                onChangeText={(text) => {
                  const newData = [...bioLinks];
                  newData[getIndex() ?? 0] = text;
                  setBioLinks(newData);
                }}
                deletable={true}
                onDelete={() => {
                  const newData = bioLinks.filter((_, i) => i !== (getIndex() ?? 0));
                  setBioLinks(newData);
                }}
              />
            )}
          />
        </View>
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 200,
  },
  input: {
    borderRadius: radius.input,
  },
  draggableList: {
    marginTop: spacing.medium,
    gap: spacing.small,
  }
  
});

export default ChangeBioLinksModal;
