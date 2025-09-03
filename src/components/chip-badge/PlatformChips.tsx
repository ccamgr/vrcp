import { omitObject } from "@/lib/objectUtils";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import IconSymbol from "../icon-components/IconView";
import { SupportedIconNames } from "../icon-components/utils";

interface Props {
  size?: number;
  platforms: string[];
  [key: string]: any;
}
const PlatformChips = ({ size, platforms, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      {platforms.map(platform => (
        <IconSymbol key={platform} size={size || 32} name={getIconNamebyPlatform(platform)} style={{color: getIconColorbyPlatform(platform)}} />
      ))}
    </View>
  );
};

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

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row",
  }
});

export default PlatformChips;