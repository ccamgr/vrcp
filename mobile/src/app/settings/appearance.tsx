import SettingItem, { SettingItemProps } from "@/components/features/settings/SettingItem";
import ThemeModal, { getIconName as getIconNameCS } from "@/components/features/settings/appearance_innermodals/ThemeModal";
import HomeTabLayoutModal, { getIconName as getIconNameHT } from "@/components/features/settings/appearance_innermodals/HomeTabLayoutModal";
import CardViewColumnsModal, { getIconName as getIconNameCV } from "@/components/features/settings/appearance_innermodals/CardViewColumnsModal";
import GenericModal from "@/components/layout/GenericModal";
import GenericScreen from "@/components/layout/GenericScreen";
import IconSymbol from "@/components/view/icon-components/IconView";
import { fontSize, spacing } from "@/configs/styles";
import { useSetting } from "@/contexts/SettingContext";
import { getUserLanguage, setUserLanguage } from "@/i18n";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import SettingItemList, { SettingItemListContents } from "@/components/features/settings/SettingItemList";

interface InnerModalOption<T> {
  open: boolean;
  defaultValue?: T;
  onSubmit?: (value: T) => void;
}

export default function AppearanceSettings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, saveSettings } = useSetting();

  const [colorSchemaModal, setColorSchemaModal] = useState<InnerModalOption<typeof settings.uiOptions_colorSchema>>({ open: false });
  const [homeTabModeModal, setHomeTabModeModal] = useState<InnerModalOption<{
    top?: typeof settings.uiOptions_homeTabTopVariant;
    bottom?: typeof settings.uiOptions_homeTabBottomVariant;
    sepPos?: typeof settings.uiOptions_homeTabSeparatePos;
  }>>({ open: false });
  const [cardViewColumnsModal, setCardViewColumnsModal] = useState<InnerModalOption<typeof settings.uiOptions_cardViewColumns>>({ open: false });
  const [friendColorModal, setFriendColorModal] = useState<InnerModalOption<typeof settings.uiOptions_friendColor>>({ open: false });
  const [favoriteFriendsColorsModal, setFavoriteFriendsColorsModal] = useState<InnerModalOption<typeof settings.uiOptions_favoriteFriendsColors>>({ open: false });

  const _tmpState = useState(""); // for re-render
  useEffect(() => {
    getUserLanguage().then(lang => {
      _tmpState[1](lang);
    });
  }, []);

  const listContents: SettingItemListContents = [
    {
      title: t("pages.setting_appearance.groupLabel_app"),
      items: [
        {
          icon: "theme-light-dark",
          title: t("pages.setting_appearance.itemLabel_theme"),
          description: t("pages.setting_appearance.itemDescription_theme"),
          leading: (
            <IconSymbol
              name={getIconNameCS(settings.uiOptions_colorSchema)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setColorSchemaModal({
            open: true,
            defaultValue: settings.uiOptions_colorSchema,
            onSubmit: (value) => {
              saveSettings({ uiOptions_colorSchema: value });
            }
          }),
        },
        {
          icon: "page-layout-body",
          title: t("pages.setting_appearance.itemLabel_homeTabLayout"),
          description: t("pages.setting_appearance.itemDescription_homeTabLayout"),
          leading: (
            <IconSymbol
              name={getIconNameHT(settings.uiOptions_homeTabTopVariant)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setHomeTabModeModal({
            open: true,
            defaultValue: {
              top: settings.uiOptions_homeTabTopVariant,
              bottom: settings.uiOptions_homeTabBottomVariant,
              sepPos: settings.uiOptions_homeTabSeparatePos,
            },
            onSubmit: (value) => {
              saveSettings({
                uiOptions_homeTabTopVariant: value.top || settings.uiOptions_homeTabTopVariant,
                uiOptions_homeTabBottomVariant: value.bottom || settings.uiOptions_homeTabBottomVariant,
                uiOptions_homeTabSeparatePos: value.sepPos || settings.uiOptions_homeTabSeparatePos,
              });
            }
          }),
        },
        {
          icon: "format-columns",
          title: t("pages.setting_appearance.itemLabel_cardViewColumns"),
          description: t("pages.setting_appearance.itemDescription_cardViewColumns"),
          leading: (
            <IconSymbol
              name={getIconNameCV(settings.uiOptions_cardViewColumns)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setCardViewColumnsModal({
            open: true,
            defaultValue: settings.uiOptions_cardViewColumns,
            onSubmit: (value) => {
              saveSettings({ uiOptions_cardViewColumns: value });
            }
          }),
        },
      ],
    },
    {
      title: t("pages.setting_appearance.groupLabel_friends"),
      items: [
        {
          icon: "account",
          title: t("pages.setting_appearance.itemLabel_friendColor"),
          description: t("pages.setting_appearance.itemDescription_friendColor"),
          leading: <ColorSquarePreview colors={[settings.uiOptions_friendColor]} />,
          onPress: () => setFriendColorModal({
            open: true,
            defaultValue: settings.uiOptions_friendColor,
            onSubmit: (value) => {
              saveSettings({ uiOptions_friendColor: value });
            }
          }),
        },
        {
          icon: "group",
          title: t("pages.setting_appearance.itemLabel_favoriteFriendsColors"),
          description: t("pages.setting_appearance.itemDescription_favoriteFriendsColors"),
          leading: <ColorSquarePreview colors={Object.values(settings.uiOptions_favoriteFriendsColors)} />,
          onPress: () => setFavoriteFriendsColorsModal({
            open: true,
            defaultValue: settings.uiOptions_favoriteFriendsColors,
            onSubmit: (value) => {
              saveSettings({ uiOptions_favoriteFriendsColors: value });
            }
          }),
        },
      ]
    },
  ]

  return (
    <GenericScreen scrollable >
      <SettingItemList contents={listContents} />


      {/* inner Modals for each setting Items */}

      <ThemeModal
        open={colorSchemaModal.open}
        setOpen={(v) => setColorSchemaModal(prev => ({ ...prev, open: v }))}
        defaultValue={colorSchemaModal.defaultValue}
        onSubmit={colorSchemaModal.onSubmit}
      />

      <HomeTabLayoutModal
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

    </GenericScreen>
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
  settingItemContainer: {
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
