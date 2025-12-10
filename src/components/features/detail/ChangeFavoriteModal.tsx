import { TouchableOpacity } from "@/components/CustomElements";
import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { getTintedColor } from "@/libs/utils";
import { Avatar, FavoriteGroup, FavoriteType, User, UserStatus, World } from "@/vrchat/api";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: User | Avatar | World | undefined;
  type: FavoriteType;
  onSuccess?: () => void;
}

const ChangeFavoriteModal = ({ open, setOpen, item, onSuccess, type }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {favoriteGroups, favorites} = useData();
  const [isLoading, setIsLoading] = useState(false);

  const [groups, setGroups] = useState<FavoriteGroup[]>([]);
  const [group, setGroup] = useState<FavoriteGroup | null>(null);


  const getInitial = (): {group: FavoriteGroup | null, groups: FavoriteGroup[]} => {
    if (!item) return {group: null, groups: []};
    const groups = favoriteGroups.data.filter(g => g.type == type).sort((a,b) => a.name.localeCompare(b.name));
    const fav = favorites.data.find((fav) => fav.favoriteId === item.id);
    if (fav) {
      const group = groups.find((g) => fav.tags.includes(g.name));
      if (group) {
        return {group, groups};
      }
    }
    return {group: null, groups};
  };

  const handleSubmitChange = async () => {
    if (!item) return;
    if (isLoading) return;
    try {
      setIsLoading(true);
      // first remove 
      const res = await vrc.favoritesApi.removeFavorite({
        favoriteId: item.id,
      });
      if (group) {// add 
        const res = await vrc.favoritesApi.addFavorite({
          addFavoriteRequest: {
            favoriteId: item.id,
            type: type,
            tags: [group.name],
          }
        });
      }
      onSuccess?.();
      setOpen(false);
    } catch (error) {
      showToast("error", "Failed to update favorite.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const {group, groups} = getInitial();
    setGroups(groups);
    setGroup(group);
  }, [open]);

  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.changeFavoriteModal.button_cancel"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: t("components.changeFavoriteModal.button_save"),
      onPress: handleSubmitChange,
      color: theme.colors.primary,
      // disabled: !group,
      flex: 1, 
    },
  ]
  return (
    <GenericModal buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>
      {isLoading && <LoadingIndicator absolute />}
      {groups.map((g) => (
        <View key={g.id}>
          <TouchableOpacity onPress={() => setGroup(g)}>
            <View style={[styles.group, {backgroundColor: theme.colors.card}, group?.id == g.id && {borderColor: theme.colors.primary}]}>
              <Text style={[g.displayName.length ? {color: theme.colors.text} : { fontStyle: "italic", color: theme.colors.subText }]}>{g.displayName.length > 0 ? g.displayName : "*No Name*"}</Text>
            </View>
          </TouchableOpacity>
        </View>
      ))}
      {/* remove */}
      <TouchableOpacity onPress={() => setGroup(null)}>
        <View style={[styles.group, {backgroundColor: getTintedColor(theme.colors.error)}, group === null && {borderColor: theme.colors.error}]}>
          <Text style={[{color: theme.colors.text}]}>{t("components.changeFavoriteModal.button_unselect")}</Text>
        </View>
      </TouchableOpacity>
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  group: {
    marginBottom: spacing.small,
    padding: spacing.medium,
    borderWidth: 2,
    borderRadius: radius.small,
    borderColor: "transparent", 
  },
  
});

export default ChangeFavoriteModal;
