import { fontSize, spacing } from "@/config/styles";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface Props {
  size?: number;
}

const LoadingIndicator = ({size}: Props) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size || 90} color={theme.colors.border} />
      <Text style={[styles.text, {color: theme.colors.subText}]} >Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    backgroundClip: "padding-box",
  },
  text: {
    marginTop: spacing.medium,
    fontSize: fontSize.medium,
  },
});

export default LoadingIndicator;
