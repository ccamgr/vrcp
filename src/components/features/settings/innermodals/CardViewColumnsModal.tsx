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

type CardViewColumns = Setting["uiOptions"]["layouts"]["cardViewColumns"];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultValue: CardViewColumns | undefined;
  onSubmit?: (value: CardViewColumns) => void;
}

  
export const getIconName = (v: CardViewColumns): SupportedIconNames => {
  if (v === 1) return 'looks-one';
  if (v === 2) return 'looks-two';
  if (v === 3) return 'looks-3';
  return 'square';
};

const getButtonText = (v: CardViewColumns): string => {
  return `${v} Column${v > 1 ? 's' : ''}`;
}

const getTextLabel = (v: CardViewColumns): string => {
  return "It may require restarting the app.";
}

const CardViewColumnsModal = ({ open, onClose, defaultValue, onSubmit }: Props) => {
  const theme = useTheme();
  const [ selectedValue, setSelectedValue ] = useState<CardViewColumns>(defaultValue || 2);

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
          {Array.from([1, 2, 3]).map((v) => (
            <TouchableOpacity
              key={`color-schema-option-${v}`}
              style={[styles.item, { borderColor: v === selectedValue ? theme.colors.primary : theme.colors.border }]}
              onPress={() => {
                setSelectedValue(v as CardViewColumns);
              }}
            >
              <IconSymbol
                name={getIconName(v as CardViewColumns)}
                size={48}
                color={theme.colors.text}
              />
              <Text style={[{ color: theme.colors.text }]}>
                {getButtonText(v as CardViewColumns)}
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


export default CardViewColumnsModal;