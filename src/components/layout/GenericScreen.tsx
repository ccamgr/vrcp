import { spacing } from "@/config/styles";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

interface GenericScreenProps {
  // title?: string; // screen title
  // action?: React.ReactNode | "back"; // left action, default back
  // contents?: React.ReactNode; // right actions

  children: React.ReactNode;
}

const GenericScreen = ({
  // title,
  // action,
  // contents,
  children,
}: GenericScreenProps) => {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={styles.screenRoot}>
      {/* <View style={[styles.screenHeader, {backgroundColor: theme.colors.border}]}>
        <View style={styles.screenHeaderTitleAndAction}>
          {
            action == "back" 
            ? <IconButton onPress={router.back} iconName="chevron-left" />
            : action
          }
          <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "bold", marginLeft: action ? 10 : 40 }}>
            {title}
          </Text>
        </View>
        <View style={styles.screenHeaderContents}>
          {contents}
        </View>
      </View> */}
      <View style={styles.screenContainer}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    // attach to Root-View
    flex: 1,
  },
  screenHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 64,
    padding: spacing.small,
  },
  screenHeaderTitleAndAction: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  screenHeaderContents: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  screenContainer: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    paddingHorizontal: spacing.small,
  },
});

export default GenericScreen;
