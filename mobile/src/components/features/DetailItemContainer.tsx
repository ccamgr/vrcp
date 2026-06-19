import { fontSize, spacing } from "@/configs/styles";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import IconButton from "../view/icon-components/IconButton";
import { SupportedIconNames } from "../view/icon-components/utils";

interface Props {
  title: string;
  children?: React.ReactNode;
  iconButtonConfig?: {
    name?: SupportedIconNames;
    onPress: () => void;
  }[];
}

const DetailItemContainer = ({ title, children, iconButtonConfig }: Props) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.onBorderLine}>
        <Text
          style={[styles.title, { backgroundColor: theme.colors.background }]}
        >
          {title}
        </Text>
        <View style={styles.iconContainer}>
          {iconButtonConfig &&
            iconButtonConfig.map((conf, idx) => (
              <IconButton
                key={`detail-item-icon-${idx}`}
                style={[
                  styles.icon,
                  { backgroundColor: theme.colors.background },
                ]}
                name={conf.name ?? "edit"}
                size={fontSize.large}
                onPress={conf.onPress}
              />
            ))}
        </View>
      </View>
      <View style={styles.children}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.medium,
    borderWidth: 1,
    borderTopColor: "gray",
  },
  onBorderLine: {
    position: "absolute",
    width: "100%",
    transform: [{ translateY: -(fontSize.medium / 1.5) }],
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    transform: [{ translateX: -1 }],
    paddingRight: spacing.small,
    fontWeight: "bold",
  },
  iconContainer: {
    display: "flex",
    flexDirection: "row",
  },
  icon: {
    paddingHorizontal: spacing.small,
    // borderWidth: 1, borderColor: "red", borderStyle: "dotted",
  },
  children: {
    marginTop: spacing.small,
    padding: spacing.small,
    display: "flex",
    flexDirection: "row",
    // borderStyle:"dotted", borderColor:"blue",borderWidth:1
  },
});

export default DetailItemContainer;
