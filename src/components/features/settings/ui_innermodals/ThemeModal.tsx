import { TouchableOpacity } from "@/components/CustomElements";
import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import { radius, spacing } from "@/configs/styles";
import { Setting } from "@/contexts/SettingContext";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";

type ColorSchema = Setting["uiOptions"]["theme"]["colorSchema"];

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  defaultValue: ColorSchema | undefined;
  onSubmit?: (value: ColorSchema) => void;
}

export const getIconName = (v: ColorSchema): SupportedIconNames => {
  if (v === 'light') return 'sunny';
  if (v === 'dark') return 'dark-mode';
  if (v === 'system') return 'theme-light-dark';
  return 'theme-light-dark';
};



const ThemeModal = ({ open, setOpen, defaultValue, onSubmit }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ selectedValue, setSelectedValue ] = useState<ColorSchema>(defaultValue || 'system');

  useEffect(() => {
    if (!defaultValue) return;
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  
  const getButtonText = (v: ColorSchema): string => {
    switch (v) {
      case 'light':
        return t("components.uiModal.innerModals.theme.option_light");
      case 'dark':
        return t("components.uiModal.innerModals.theme.option_dark");
      case 'system':
        return t("components.uiModal.innerModals.theme.option_system");
      default:
        return "";
    }
  }

  const buttonItems: ButtonItemForFooter[] = [
    {
      // use button as text display only 
      type: "text",
      title: t("components.uiModal.innerModals.theme.maybe_requireRestart"),
      flex: 1,
    },
    {
      title: t("components.uiModal.innerModals.theme.button_apply"),
      onPress: () => {
        onSubmit?.(selectedValue);
        setOpen(false);
      },
    },
  ];

  return (
      <GenericModal
        showCloseButton
        open={open}
        onClose={() => setOpen(false)}
        buttonItems={buttonItems}
      >
        <View style={styles.container}>
          {['light', 'system', 'dark'].map((value) => (
            <TouchableOpacity
              key={`color-schema-option-${value}`}
              style={[styles.item, { borderColor: value === selectedValue ? theme.colors.primary : theme.colors.border }]}
              onPress={() => {
                setSelectedValue(value as ColorSchema);
              }}
            >
              <IconSymbol
                name={getIconName(value as ColorSchema)}
                size={48}
                color={theme.colors.text}
              />
              <Text style={[{ color: theme.colors.text }]}>
                {getButtonText(value as ColorSchema)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GenericModal>

  )
}

const styles = StyleSheet.create({
    // innermodal styles
  container: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    width: "32%",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.small,
    borderStyle: "solid", 
    borderWidth: 1,
    borderRadius: radius.small,
  },
  icon: {},
});


export default ThemeModal;