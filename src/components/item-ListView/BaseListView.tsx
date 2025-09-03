import { fontSize, radius, spacing } from "@/config/styles";
import { omitObject } from "@/lib/objectUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface Props<T> {
  data: T;
  // extractImageUrl: (data: T) => string;
  title:  string | ((data: T) => string);
  subtitles?: string[] | ((data: T) => string[]);
  onPress?: () => void;
  onLongPress?: () => void;
  OverlapComponents?: React.ReactNode; // Optional components to overlap on the card
  // Additional props
  [key: string]: any;
  ContainerStyle?: any;
  TitleStyle?: any;
  SubtitleStyle?: any;
}

const BaseListView = <T,>({ data, onPress, onLongPress, title, subtitles, OverlapComponents, ...rest }: Props<T>) => {
  const theme = useTheme();
  const resolvedTitle = typeof title === "function" ? title(data) : title;
  const resolvedSubtitles = typeof subtitles === "function" ? subtitles(data) : subtitles;
  return (
    <View style={[styles.root, rest.style]}  {...omitObject(rest, "style", "ContainerStyle", "TitleStyle", "SubtitleStyle")}>
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={[styles.base, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.container, rest.ContainerStyle]}>
        <Text style={[styles.title, rest.TitleStyle]} numberOfLines={1}>{resolvedTitle}</Text>
        {resolvedSubtitles && resolvedSubtitles.map((subtitle, index) => (
          <Text key={index} style={[styles.subtitle, rest.SubtitleStyle]} numberOfLines={1}>{subtitle}</Text>
        ))}
      </View>
      <View style={styles.overlap}>
        {OverlapComponents}  
      </View>
    </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {    
    padding: spacing.small,
  },
  base: {
    overflow: "hidden",
    width: "100%",
    borderRadius: radius.small,
  },
  overlap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: radius.small,

  },
  container: {
    display: "flex",
    justifyContent: "center",
    padding: spacing.small,

  },
  title: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: fontSize.small,
  },
});
export default BaseListView;