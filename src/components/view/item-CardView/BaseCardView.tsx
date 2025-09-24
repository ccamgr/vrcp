import { fontSize, radius, spacing } from "@/config/styles";
import { CachedImage } from "@/contexts/CacheContext";
import { omitObject } from "@/lib/objectUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface Props<T> {
  data: T;
  imageUrl: string | ((data: T) => string);
  title: string | ((data: T) => string);
  onPress?: () => void;
  onLongPress?: () => void;
  OverlapComponents?: React.ReactNode; // Optional components to overlap on the card
  // Additional props
  [key: string]: any;
  ImageStyle?: any;
  FooterStyle?: any;
  TitleStyle?: any;
}

const BaseCardView = <T,>({
  data,
  onPress,
  onLongPress,
  imageUrl,
  title,
  OverlapComponents,
  ...rest
}: Props<T>) => {
  const theme = useTheme();
  const resolvedImageUrl =
    typeof imageUrl === "function" ? imageUrl(data) : imageUrl;
  const resolvedTitle = typeof title === "function" ? title(data) : title;
  return (
    <View
      style={[styles.root, rest.style]}
      {...omitObject(rest, "style", "ImageStyle", "FooterStyle", "TitleStyle")}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.base, { backgroundColor: theme.colors.card }]}
      >
        <CachedImage
          src={resolvedImageUrl}
          style={[styles.image, rest.ImageStyle]}
        />
        <View style={[styles.footer, rest.FooterStyle]}>
          <Text style={[styles.title, rest.TitleStyle]} numberOfLines={1}>
            {resolvedTitle}
          </Text>
        </View>
        <View style={styles.overlap}>{OverlapComponents}</View>
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
    height: "auto",
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
  image: {
    aspectRatio: 16 / 9, //default
    resizeMode: "cover",
    overflow: "hidden",
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.small,
  },
  title: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
  },
});
export default BaseCardView;
