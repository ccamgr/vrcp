import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import {
  FriendLocationFilter,
  isFavoriteGroupEnabled,
} from "@/lib/funcs/filterFriendLocations";
import { useFavoriteGroups } from "@/hooks/vrc/useFavoriteGroups";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  setOpen: (value: boolean) => void;
  defaultValue: FriendLocationFilter | undefined;
  onSubmit?: (value: FriendLocationFilter) => void;
}

const FriendLocationFilterModal = ({
  open,
  setOpen,
  defaultValue,
  onSubmit,
}: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: favoriteGroups, isLoading } = useFavoriteGroups();
  const [selectedFilter, setSelectedFilter] = useState<FriendLocationFilter>(
    defaultValue ?? { enabledFavoriteGroups: {}, includeNonFavorite: false },
  );
  const friendGroups = useMemo(
    () =>
      (favoriteGroups ?? [])
        .filter((group) => group.type === "friend")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [favoriteGroups],
  );

  useEffect(() => {
    if (defaultValue) setSelectedFilter(defaultValue);
  }, [defaultValue]);

  const updateGroup = (groupName: string, enabled: boolean) => {
    setSelectedFilter((current) => ({
      ...current,
      enabledFavoriteGroups: {
        ...current.enabledFavoriteGroups,
        [groupName]: enabled,
      },
    }));
  };

  const buttonItems: ButtonItemForFooter[] = [
    {
      title: t(
        "pages.setting_appearance.innerModals.friendLocationFilter.button_apply",
      ),
      disabled: isLoading,
      onPress: () => {
        onSubmit?.(selectedFilter);
        setOpen(false);
      },
    },
  ];

  return (
    <GenericModal
      open={open}
      onClose={() => setOpen(false)}
      title={t(
        "pages.setting_appearance.innerModals.friendLocationFilter.title",
      )}
      showCloseButton
      scrollable
      buttonItems={buttonItems}
    >
      {isLoading ? (
        <View style={styles.loading}>
          <LoadingIndicator absolute />
        </View>
      ) : (
        <View style={styles.container}>
          {friendGroups.map((group) => (
            <View
              key={group.name}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {group.displayName || group.name}
              </Text>
              <Switch
                value={isFavoriteGroupEnabled(selectedFilter, group.name)}
                onValueChange={(value) => updateGroup(group.name, value)}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
              />
            </View>
          ))}
          <View
            style={[styles.row, { borderBottomColor: theme.colors.border }]}
          >
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t(
                "pages.setting_appearance.innerModals.friendLocationFilter.option_nonFavorite",
              )}
            </Text>
            <Switch
              value={selectedFilter.includeNonFavorite}
              onValueChange={(value) =>
                setSelectedFilter((current) => ({
                  ...current,
                  includeNonFavorite: value,
                }))
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
            />
          </View>
        </View>
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.small,
  },
  loading: {
    height: 160,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.small,
  },
  label: {
    flex: 1,
    paddingRight: spacing.medium,
  },
});

export default FriendLocationFilterModal;
