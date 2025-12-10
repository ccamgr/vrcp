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

type CardViewColumns = Setting["uiOptions"]["layouts"]["cardViewColumns"];

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  defaultValue: CardViewColumns | undefined;
  onSubmit?: (value: CardViewColumns) => void;
}

  
export const getIconName = (v: CardViewColumns): SupportedIconNames => {
  if (v === 1) return 'looks-one';
  if (v === 2) return 'looks-two';
  if (v === 3) return 'looks-3';
  return 'square';
};



const CardViewColumnsModal = ({ open, setOpen, defaultValue, onSubmit }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ selectedValue, setSelectedValue ] = useState<CardViewColumns>(defaultValue || 2);

  useEffect(() => {
    if (!defaultValue) return;
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  const getButtonText = (v: CardViewColumns): string => {
  switch (v) {
    case 1:
      return t("components.uiModal.innerModals.cardViewColumns.option_1_columns");
    case 2:
      return t("components.uiModal.innerModals.cardViewColumns.option_2_columns");
    case 3:
      return t("components.uiModal.innerModals.cardViewColumns.option_3_columns");
    default:
      return "";
  }
}

  const buttonItems: ButtonItemForFooter[] = [
    {
      // use button as text display only
      type: "text",
      title: t("components.uiModal.innerModals.cardViewColumns.maybe_requireRestart"),
      flex: 1,
    },
    {
      title: t("components.uiModal.innerModals.cardViewColumns.button_apply"),
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