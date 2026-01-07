import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import globalStyles, { fontSize, spacing } from "@/configs/styles";
import { omitObject } from "@/lib/utils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import SettingItem, { SettingItemProps } from "./SettingItem";

interface SettingItemGroup {
  title: string;
  items: SettingItemProps[];
}
export type SettingItemListContents = SettingItemGroup[];

interface SettingItemListProps {
  contents: SettingItemListContents;
}

const SettingItemList = ({
  contents,
  ...rest
}: SettingItemListProps ) => {
  const theme = useTheme();
  return (
    <View {...rest}>
      {contents.map((grp) => (
        <View key={grp.title} style={styles.groupContainer}>
          <Text style={[styles.groupHeader, { color: theme.colors.text }]}>
            {grp.title}
          </Text>
          {grp.items.map((item, index) => (
            <SettingItem
              key={index}
              {...item}
              style={[styles.listItemContainer, { borderBottomColor: theme.colors.border }, item.style]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}



const styles = StyleSheet.create({
  groupHeader: {
    fontSize: fontSize.medium,
    fontWeight: "bold"
  },
  groupContainer: {
    padding: spacing.medium,
    gap: spacing.small,
  },
  listItemContainer: {
    borderBottomWidth: 1
  },
  listItemLabel: {
    marginLeft: spacing.medium,
  },
});

export default SettingItemList
