import GenericModal from "@/components/layout/GenericModal";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import SettingItem, { SettingItemProps } from "./SettingItem";
import { StyleSheet, Switch, View } from "react-native";
import { Text } from "react-native";
import { fontSize, spacing } from "@/configs/styles";
import { useSetting } from "@/contexts/SettingContext";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}


interface SectionProps {
  title: string;
  items: SettingItemProps[];
}

const DevelopmentModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, saveSettings } = useSetting();

  const sectionItems: SectionProps[] = [
    {
      title: t("components.developmentModal.groupLabel_debug"),
      items: [
        {
          icon: "bug-outline",
          title: t("components.developmentModal.itemLabel_sendLogs"),
          description: t("components.developmentModal.itemDescription_sendLogs"),
          leading: (
            <Switch
              value={settings.otherOptions_sendDebugLogs}
              onValueChange={(value) => {
                saveSettings({ otherOptions_sendDebugLogs: value });
              }}
            />
          )
        },
        {
          icon: "code",
          title: t("components.developmentModal.itemLabel_json"),
          description: t("components.developmentModal.itemDescription_json"),
          leading: (
            <Switch
              value={settings.otherOptions_enableJsonViewer}
              onValueChange={(value) => {
                saveSettings({ otherOptions_enableJsonViewer: value });
              }}
            />
          )
        },
      ]
    },
    {
      title: t("components.developmentModal.groupLabel_feature"),
      items: [

      ]
    }
  ]

  return (
    <GenericModal
      title={t("components.developmentModal.label")}
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
    >
      {sectionItems.map((section, index) => (
        <View key={`section-${index}`}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeaderText, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionHeaderDivider, { borderBottomColor: theme.colors.border }]} />
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
    </GenericModal>
  );
};


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


export default DevelopmentModal;
