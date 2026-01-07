import { TouchableEx } from "@/components/CustomElements";
import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import globalStyles, { fontSize, spacing } from "@/configs/styles";
import { omitObject } from "@/lib/utils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

export interface SettingItemProps {
  icon: SupportedIconNames;
  iconColor?: string;
  title: string;
  description?: string;
  leading?: React.ReactNode;
  onPress?: () => void;
  [key: string]: any;
}
const SettingItem = ({
  icon,
  iconColor,
  title,
  description,
  leading,
  onPress,
  ...rest
}: SettingItemProps ) => {
  const theme = useTheme();
  return (
    <TouchableEx onPress={onPress}  >
      <View style={[styles.container, rest.style]} {...omitObject(rest, 'style')}>
        <View style={styles.icon}>
          <IconSymbol name={icon} size={fontSize.large * 1.3} color={iconColor ?? theme.colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: theme.colors.subText }]}>
            {description}
          </Text>
        </View>
        <View>{leading}</View>
      </View>
    </TouchableEx>
  );
}



const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.small,
  },
  icon: {
    marginRight: spacing.medium
  },
  title: {
    fontSize: fontSize.medium,
    fontWeight: "normal"
  },
  description: {
    fontSize: fontSize.small,
    fontWeight: "normal"
  },
});

export default SettingItem
