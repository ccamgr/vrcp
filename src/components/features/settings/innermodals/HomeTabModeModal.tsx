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

type HomeTabMode = Setting["uiOptions"]["layouts"]["homeTabMode"];

interface Props {
  open: boolean;
  onClose: () => void;
  defaultValue: HomeTabMode | undefined;
  onSubmit?: (value: HomeTabMode) => void;
}

  
export const getIconName = (v: HomeTabMode): SupportedIconNames => {
  if (v === 'default') return 'home';
  if (v === 'friend-locations') return 'map';
  if (v === 'feeds') return 'rss';
  if (v === 'calendar') return 'calendar';
  return 'home';
};

const getButtonText = (v: HomeTabMode): string => {
  if (v === 'default') return "Default";
  if (v === 'friend-locations') return "Locations";
  if (v === 'feeds') return "Feeds";
  if (v === 'calendar') return "Calendar";
  return "";
}

const getTextLabel = (v: HomeTabMode): string => {
  if (v === 'default') return "Feeds & Friend Locations";
  if (v === 'friend-locations') return "All-Friend Locations";
  if (v === 'feeds') return "Feeds";
  if (v === 'calendar') return "Event Calendar";
  return "It may require restarting the app.";
}

const HomeTabModeModal = ({ open, onClose, defaultValue, onSubmit }: Props) => {
  const theme = useTheme();
  const [ selectedValue, setSelectedValue ] = useState<HomeTabMode>(defaultValue || 'default');

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
          {[ 'default', 'friend-locations', 'feeds', 'calendar' ].map((value) => (
            <TouchableOpacity
              key={`color-schema-option-${value}`}
              style={[styles.item, { borderColor: value === selectedValue ? theme.colors.primary : theme.colors.border }]}
              onPress={() => {
                setSelectedValue(value as HomeTabMode);
              }}
            >
              <IconSymbol
                name={getIconName(value as HomeTabMode)}
                size={48}
                color={theme.colors.text}
              />
              <Text style={[{ color: theme.colors.text }]}>
                {getButtonText(value as HomeTabMode)}
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
    width: "24%",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.small,
    borderStyle: "solid", 
    borderWidth: 1,
    borderRadius: radius.small,
  },
  icon: {},
});


export default HomeTabModeModal;