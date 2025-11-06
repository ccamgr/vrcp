import IconButton from "@/components/view/icon-components/IconButton";
import globalStyles, { radius, spacing } from "@/configs/styles";
import { omitObject } from "@/libs/utils";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";



interface Props {
  title: string;
  onPress: () => void;
  children: React.ReactNode;
  [key: string]: any;
}

const SeeMoreContainer = ({ title, onPress, children, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      <View style={[styles.card, {backgroundColor: theme.colors.paper}]} >
        <View style={styles.header}>
          <Text style={globalStyles.subheader}>{title}</Text>
          <Button 
            onPress={onPress} 
            variant="plain"
          >
            {"See More" + "  >"}
          </Button>
        </View>
        <View style={styles.children}>
          {children}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.small,
  },
  card: {
    borderRadius: radius.small,
    height: "100%",
  },
  header:{
    display:"flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: spacing.large,
  },

  children: {
    flexGrow: 1,
    flexShrink: 1,
    marginBottom: spacing.small,
  },
  cardView: {
    padding: spacing.small,
    width: "50%",
  },
});

export default SeeMoreContainer;