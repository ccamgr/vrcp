import { TouchableEx } from "@/components/CustomElements";
import { radius, spacing } from "@/configs/styles";
import { omitObject } from "@/lib/utils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

interface Props {
  tags: string[];
  onPress?: (tag: string) => void;
  [key: string]: any;
}
const TagChips = ({ tags, onPress, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      {tags.map((tag) => (
        <TouchableEx key={tag} onPress={onPress ? () => onPress(tag) : undefined}>
          <Text style={[styles.tag, { backgroundColor: theme.colors.card }]}>{tag}</Text>
        </TouchableEx>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexWrap: "wrap",
    display: "flex",
    flexDirection: "row",
  },
  tag: {
    borderRadius: radius.all,
    paddingVertical: spacing.mini,
    paddingHorizontal: spacing.medium,
    margin: spacing.mini,
  },
});

export default TagChips;
