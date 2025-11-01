import GenericModal from "@/components/layout/GenericModal";
import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useCache } from "@/contexts/CacheContext";
import { useSetting } from "@/contexts/SettingContext";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import SettingItem, { SettingItemProps } from "./components/SettingItem";
import { ScrollView } from "react-native-gesture-handler";
import ColorSchemaModal, { getIconName as getIconNameCS } from "./ui_innermodals/ColorSchemaModal";
import HomeTabModeModal, { getIconName as getIconNameHT } from "./ui_innermodals/HomeTabModeModal";
import CardViewColumnsModal, { getIconName as getIconNameCV } from "./ui_innermodals/CardViewColumnsModal";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface SectionProps {
  title: string;
  items: SettingItemProps[];
}

interface InnerModalOption<T> {
  open: boolean;
  defaultValue?: T;
  onSubmit?: (value: T) => void;
}

const UIModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { settings, saveSettings } = useSetting();
  const { uiOptions } = settings;

  const [colorSchemaModal, setColorSchemaModal] = useState<InnerModalOption<typeof uiOptions.theme.colorSchema>>({open: false});
  const [homeTabModeModal, setHomeTabModeModal] = useState<InnerModalOption<typeof uiOptions.layouts.homeTabMode>>({open: false});
  const [cardViewColumnsModal, setCardViewColumnsModal] = useState<InnerModalOption<typeof uiOptions.layouts.cardViewColumns>>({open: false});
  const [friendColorModal, setFriendColorModal] = useState<InnerModalOption<typeof uiOptions.user.friendColor>>({open: false});
  const [favoriteFriendsColorsModal, setFavoriteFriendsColorsModal] = useState<InnerModalOption<typeof uiOptions.user.favoriteFriendsColors>>({open: false});

  const sectionItems: SectionProps[] = [
    {
      title: "Theme",
      items: [
        {
          icon: "theme-light-dark",
          title: "Color Schema",
          description: "Select your color schema",
          leading: (
            <IconSymbol
              name={getIconNameCS(uiOptions.theme.colorSchema)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setColorSchemaModal({
            open: true,
            defaultValue: uiOptions.theme.colorSchema,
            onSubmit: (value) => {
              saveSettings({ ...settings, uiOptions: { ...uiOptions, theme: { ...uiOptions.theme, colorSchema: value } } });
            }
          }),
        },
      ]
    },
    {
      title: "Layout",
      items: [
        {
          icon: "page-layout-body",
          title: "Home Tab",
          description: "Select layout modes for the home tab",
          leading: (
            <IconSymbol
              name={getIconNameHT(uiOptions.layouts.homeTabMode)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setHomeTabModeModal({
            open: true,
            defaultValue: uiOptions.layouts.homeTabMode,
            onSubmit: (value) => {
              saveSettings({ ...settings, uiOptions: { ...uiOptions, layouts: { ...uiOptions.layouts, homeTabMode: value } } });
            }
          }),
        },
        {
          icon: "format-columns",
          title: "Card View Columns",
          description: "Select number of columns for the card view",
          leading: (
            <IconSymbol
              name={getIconNameCV(uiOptions.layouts.cardViewColumns)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setCardViewColumnsModal({
            open: true,
            defaultValue: uiOptions.layouts.cardViewColumns,
            onSubmit: (value) => {
              saveSettings({ ...settings, uiOptions: { ...uiOptions, layouts: { ...uiOptions.layouts, cardViewColumns: value } } });
            }
          }),
        },
      ]
    },
    {
      title: "Color",
      items: [
        {
          icon: "account",
          title: "Friend Color",
          description: "Select your friends color theme",
          leading: <ColorSquarePreview colors={[uiOptions.user.friendColor]} />,
          onPress: () => setFriendColorModal({
            open: true,
            defaultValue: uiOptions.user.friendColor,
            onSubmit: (value) => {
              saveSettings({ ...settings, uiOptions: { ...uiOptions, user: { ...uiOptions.user, friendColor: value } } });
            }
          }),
        },
        {
          icon: "group",
          title: "Favorite Friend Color",
          description: "Select your favorite-friends color theme",
          leading: <ColorSquarePreview colors={Object.values(uiOptions.user.favoriteFriendsColors)} />,
          onPress: () => setFavoriteFriendsColorsModal({
            open: true,
            defaultValue: uiOptions.user.favoriteFriendsColors,
            onSubmit: (value) => {
              saveSettings({ ...settings, uiOptions: { ...uiOptions, user: { ...uiOptions.user, favoriteFriendsColors: value } } });
            }
          }),
        },
      ]
    },
  ]

  return (
    <GenericModal
      title="UI Settings"
      size="large"
      showCloseButton
      scrollable
      open={open}
      onClose={() => setOpen(false)}
    >
      {sectionItems.map((section, index) => (
        <View key={`section-${index}`}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeaderText, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionHeaderDivider, { borderBottomColor: theme.colors.border}]} />
          </View>
          <View style={styles.settingItemContainer}>
            {section.items.map((item, idx) => (
              <SettingItem 
                style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
                key={`section-${index}-item-${idx}`}
                icon={item.icon}
                title={item.title}
                description={item.description}
                leading={item.leading}
                onPress={item.onPress}
              />
            ))}
          </View>
        </View>
      ))}
      

      {/* inner Modals for each setting Items */}

      <ColorSchemaModal
        open={colorSchemaModal.open}
        setOpen={(v) => setColorSchemaModal(prev => ({ ...prev, open: v }))}
        defaultValue={colorSchemaModal.defaultValue}
        onSubmit={colorSchemaModal.onSubmit}
      />

      <HomeTabModeModal
        open={homeTabModeModal.open}
        setOpen={(v) => setHomeTabModeModal(prev => ({ ...prev, open: v }))}
        defaultValue={homeTabModeModal.defaultValue}
        onSubmit={homeTabModeModal.onSubmit}
      />

      <CardViewColumnsModal
        open={cardViewColumnsModal.open}
        setOpen={(v) => setCardViewColumnsModal(prev => ({ ...prev, open: v }))}
        defaultValue={cardViewColumnsModal.defaultValue}
        onSubmit={cardViewColumnsModal.onSubmit}
      />

    </GenericModal>
  );
};

const ColorSquarePreview = ({ colors }: { colors: string[] }) => {
  const xOffset = 4;
  const yOffset = 2;
  return (
    <View style={[
      styles.colorSquare_container,
      { marginRight: (colors.length - 1) * xOffset }
    ]}>
      {colors.map((color, index) => (
        <View 
          key={`color-square-${index}-color-${color}`}
          style={[
            styles.colorSquare_square, 
            { 
              backgroundColor: color,
              transform: [
                { translateX: index * xOffset },
                { translateY: -index * yOffset },
              ],
              zIndex: colors.length - index,
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderText: {
    fontSize: fontSize.medium,
  },
  sectionHeaderDivider: {
    flex: 1,
    marginHorizontal: spacing.medium,
  },
  settingItemContainer : {
    padding: spacing.small,
  },
  settingItem: {
    borderBottomWidth: 1,
  },
  // ColorSquare
  colorSquare_container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  colorSquare_square: {
    position: "absolute",
    right: 0,
    width: 24,
    height: 24,
    borderWidth: 1,
  },

});

export default UIModal;
