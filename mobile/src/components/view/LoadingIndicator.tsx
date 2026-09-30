import { fontSize, spacing } from "@/configs/styles";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface Props {
  size?: number;
  notext?: boolean;
  absolute?: boolean;
  overlayOnly?: boolean;
}

const LoadingIndicator = ({
  size,
  notext = false,
  absolute = false,
  overlayOnly = false,
}: Props) => {
  const theme = useTheme();
  return (
    <View
      pointerEvents={overlayOnly ? "none" : "auto"}
      style={[styles.container, absolute ? styles.absolute : {}]}
    >
      {!overlayOnly && (
        <ActivityIndicator size={size || 90} color={theme.colors.border} />
      )}
      {!overlayOnly && !notext && (
        <Text style={[styles.text, { color: theme.colors.subText }]}>
          Loading...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    backgroundClip: "padding-box",
  },
  absolute: {
    position: "absolute",
  },
  text: {
    marginTop: spacing.medium,
    fontSize: fontSize.medium,
  },
});

export default LoadingIndicator;
