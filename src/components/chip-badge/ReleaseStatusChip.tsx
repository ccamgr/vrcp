import { fontSize, spacing } from "@/config/styles";
import { AvatarLike, getReleaseStatusColor, WorldLike } from "@/lib/vrchatUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

interface Props {
  data: AvatarLike | WorldLike
  [key: string]: any
}
const ReleaseStatusChip = ({ data, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.chip,{backgroundColor: getReleaseStatusColor(data)}]} {...rest}>
      <Text style={[styles.text, {color: theme.colors.text}]}>{data.releaseStatus}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    padding: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    paddingHorizontal: spacing.small,
    fontSize: fontSize.small,
  }
});

export default ReleaseStatusChip;