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
import ThemeModal, { getIconName as getIconNameCS } from "./ui_innermodals/ThemeModal";
import HomeTabLayoutModal, { getIconName as getIconNameHT } from "./ui_innermodals/HomeTabLayoutModal";
import CardViewColumnsModal, { getIconName as getIconNameCV } from "./ui_innermodals/CardViewColumnsModal";
import { getUserLanguage, setUserLanguage } from "@/i18n";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { settings, saveSettings } = useSetting();
  const { uiOptions } = settings;

  const [colorSchemaModal, setColorSchemaModal] = useState<InnerModalOption<typeof uiOptions.theme.colorSchema>>({open: false});
  const [homeTabModeModal, setHomeTabModeModal] = useState<InnerModalOption<{
    top?: typeof uiOptions.layouts.homeTabTopVariant;
    bottom?: typeof uiOptions.layouts.homeTabBottomVariant;
    sepPos?: typeof uiOptions.layouts.homeTabSeparatePos;
  }>>({open: false});
  const [cardViewColumnsModal, setCardViewColumnsModal] = useState<InnerModalOption<typeof uiOptions.layouts.cardViewColumns>>({open: false});
  const [friendColorModal, setFriendColorModal] = useState<InnerModalOption<typeof uiOptions.user.friendColor>>({open: false});
  const [favoriteFriendsColorsModal, setFavoriteFriendsColorsModal] = useState<InnerModalOption<typeof uiOptions.user.favoriteFriendsColors>>({open: false});

  const _tmpState = useState(""); // for re-render
  useEffect(() => {
    getUserLanguage().then(lang => {
      _tmpState[1](lang);
    });
  }, []); 

  const sectionItems: SectionProps[] = [
    {
      title: t("components.uiModal.groupLabel_appearance"),
      items: [
        {
          icon: "theme-light-dark",
          title: t("components.uiModal.itemLabel_theme"),
          description: t("components.uiModal.itemDescription_theme"),
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
        {
          icon: "account",
          title: t("components.uiModal.itemLabel_friendColor"),
          description: t("components.uiModal.itemDescription_friendColor"),
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
          title: t("components.uiModal.itemLabel_favoriteFriendsColors"),
          description: t("components.uiModal.itemDescription_favoriteFriendsColors"),
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
    {
      title: t("components.uiModal.groupLabel_layouts"),
      items: [
        {
          icon: "page-layout-body",
          title: t("components.uiModal.itemLabel_homeTabLayout"),
          description: t("components.uiModal.itemDescription_homeTabLayout"),
          leading: (
            <IconSymbol
              name={getIconNameHT(uiOptions.layouts.homeTabTopVariant)}
              size={32}
              color={theme.colors.text}
            />
          ),
          onPress: () => setHomeTabModeModal({
            open: true,
            defaultValue: {
              top: uiOptions.layouts.homeTabTopVariant,
              bottom:  uiOptions.layouts.homeTabBottomVariant,
              sepPos: uiOptions.layouts.homeTabSeparatePos,
            },
            onSubmit: (value) => {
              saveSettings({ 
                ...settings, 
                uiOptions: { 
                  ...uiOptions, 
                  layouts: { 
                    ...uiOptions.layouts, 
                    homeTabTopVariant: value.top ?? uiOptions.layouts.homeTabTopVariant, 
                    homeTabBottomVariant: value.bottom ?? uiOptions.layouts.homeTabBottomVariant, 
                    homeTabSeparatePos: value.sepPos ?? uiOptions.layouts.homeTabSeparatePos, 
                  } 
                } 
              });
            }
          }),
        },
        {
          icon: "format-columns",
          title: t("components.uiModal.itemLabel_cardViewColumns"),
          description: t("components.uiModal.itemDescription_cardViewColumns"),
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
      title: t("components.uiModal.groupLabel_others"),
      items: [
        {
          icon: "language",
          title: t("components.uiModal.itemLabel_language"),
          description: t("components.uiModal.itemDescription_language"),
          onPress: async () => {
            const cur = await getUserLanguage()
            const newLang = cur === 'en' ? 'ja' : 'en';
            setUserLanguage(newLang);
            _tmpState[1](newLang); // force re-render
          },
          leading: (
            <Text style={{ color: theme.colors.text, fontWeight: "bold" }}>
              {_tmpState[0] === 'ja' ? '日本語' : 'English'}
            </Text>
          ),
        },
      ]
    }
  ]

  return (
    <GenericModal
      title={t("components.uiModal.title")}
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
