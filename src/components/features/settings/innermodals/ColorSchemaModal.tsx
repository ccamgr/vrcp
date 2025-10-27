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
import { StyleSheet, View } from "react-native";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";

type ColorSchema = Setting["uiOptions"]["theme"]["colorSchema"];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultValue: ColorSchema | undefined;
  onSubmit?: (value: ColorSchema) => void;
}

export const getIconName = (v: ColorSchema): SupportedIconNames => {
  if (v === 'light') return 'sunny';
  if (v === 'dark') return 'dark-mode';
  if (v === 'system') return 'theme-light-dark';
  return 'theme-light-dark';
};

const getButtonText = (v: ColorSchema): string => {
  return `${v.charAt(0).toUpperCase() + v.slice(1)}`;
}

const getTextLabel = (v: ColorSchema): string => {
  return "It may require restarting the app.";
}


const ColorSchemaModal = ({ open, onClose, defaultValue, onSubmit }: Props) => {
  const theme = useTheme();
  const [ selectedValue, setSelectedValue ] = useState<ColorSchema>(defaultValue || 'system');

  useEffect(() => {
    if (!defaultValue) return;
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  

  const buttonItems: ButtonItemForFooter[] = [
    {
      // use button as text display only 
      title: getTextLabel(selectedValue),
      flex: 1,
      variant: "plain",
    },
    {
      title: "Apply",
      onPress: () => {
        onSubmit?.(selectedValue);
        onClose();
      },
    },
  ];

  return (
      <GenericModal
        showCloseButton
        open={open}
        onClose={onClose}
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


export default ColorSchemaModal;