import { radius, spacing } from "@/config/styles";
import { omitObject } from "@/lib/objectUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

interface Props {
  tags: string[];
  [key: string]: any;
}
const TagChips = ({ tags, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      {tags.map(tag => (
        <Text style={[styles.tag, {backgroundColor: theme.colors.card}]} key={tag}>
          {tag}
        </Text>
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
    margin: spacing.mini
  }
});

export default TagChips;