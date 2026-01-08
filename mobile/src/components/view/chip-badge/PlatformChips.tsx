import { omitObject } from "@/lib/utils";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import IconSymbol from "../icon-components/IconView";
import { SupportedIconNames } from "../icon-components/utils";
import { Text } from "@react-navigation/elements";
import { radius, spacing } from "@/configs/styles";

interface Props {
  size?: number;
  platforms: {platform: string, avatarPerformance?: string}[];
  [key: string]: any;
}
const PlatformChips = ({ size, platforms, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      {platforms.map((platform) => (
        <View key={platform.platform} >
          <IconSymbol
            size={size || 32}
            name={getIconNamebyPlatform(platform.platform)}
            style={{ color: getIconColorbyPlatform(platform.platform) }}
          />
          {platform.avatarPerformance && (
            <PerformanceChip size={size || 32} performance={platform.avatarPerformance} />
          )}
        </View>
      ))}
    </View>
  );
};

const PerformanceChip = ({ size, performance }: { size: number; performance: string }) => {
  const theme = useTheme();
  // アイコンのほうがいいか？ (文字列としてはツールチップで？)
  return (
    <Text style={[
      styles.performance,
      {
        fontSize: size * 0.3,
        marginTop: - size * 0.3,
        marginLeft: size * 0.3,
        color: theme.colors.text,
        backgroundColor: getChipColorbyPerformance(performance),
      }]}>
      {performance}
    </Text>
  )
}

const getIconNamebyPlatform = (platform: string): SupportedIconNames => {
  switch (platform) {
    case "standalonewindows":
      return "microsoft";
    case "android":
      return "android";
    case "ios":
      return "apple";
    default:
      return "question-mark";
  }
};

const getIconColorbyPlatform = (platform: string) => {
  switch (platform) {
    case "standalonewindows":
      return "#3083ffff";
    case "android":
      return "#56a63dff";
    case "ios":
      return "#afafafff";
    default:
      return "question-mark";
  }
};
const getChipColorbyPerformance = (performance: string) => {
  switch (performance) {
    case "VeryPoor":
      return "#e13602ff";
    case "Poor":
      return "#e13602ff";
    case "Medium":
      return "#e1a202ff";
    case "Good":
      return "#58b847ff";
    case "Excellent":
      return "#58b847ff";
    default:
      return "#888888ff";
  }
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row",
  },
  performance: {
    borderRadius: radius.all,
    paddingHorizontal: spacing.small,
    borderStyle:"dotted", borderColor:"red",borderWidth:1
  }
});

export default PlatformChips;
