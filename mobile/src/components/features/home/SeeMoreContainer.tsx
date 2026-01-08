import { ButtonEx } from "@/components/CustomElements";
import IconButton from "@/components/view/icon-components/IconButton";
import globalStyles, { radius, spacing } from "@/configs/styles";
import { omitObject } from "@/lib/utils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";



interface Props {
  title: string;
  onPress?: () => void;
  children: React.ReactNode;
  [key: string]: any;
}

const SeeMoreContainer = ({ title, onPress, children, ...rest }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      <View style={[styles.card, {backgroundColor: theme.colors.paper}]} >
        <View style={styles.header}>
          <Text style={globalStyles.subheader}>{title}</Text>
          {onPress && (
            <ButtonEx
              onPress={onPress}
              variant="plain"
            >
              {t("pages.home.see_more") + "  >"}
            </ButtonEx>
          )}
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
