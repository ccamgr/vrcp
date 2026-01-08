import { fontSize, radius, spacing } from "@/configs/styles";
import { CachedImage } from "@/contexts/CacheContext";
import { getStatusColor, getTrustRankColor, getUserIconUrl, getUserProfilePicUrl, UserLike } from "@/lib/vrchat";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import IconSymbol from "../../icon-components/IconView";
import BaseCardView from "../BaseCardView";
import { TouchableEx } from "@/components/CustomElements";

interface Props {
  user: UserLike;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressImage?: () => void;
  onLongPressImage?: () => void;
  onPressIcon?: () => void;
  onLongPressIcon?: () => void;

  isMe?: boolean;

  [key: string]: any;
}
const extractImageUrl = (data: UserLike) => getUserProfilePicUrl(data, true);
const extractTitle = (data: UserLike) => data.displayName;

const CardViewUserDetail = ({
  user,
  onPress,
  onLongPress,
  onPressIcon,
  onLongPressIcon,
  isMe = false,
  ...rest
}: Props) => {
  const theme = useTheme();
  return (
    <BaseCardView
      data={user}
      imageUrl={extractImageUrl}
      title={extractTitle}
      onPress={onPress}
      onLongPress={onLongPress}
      FooterStyle={styles.footer}
      TitleStyle={[styles.name, { color: getTrustRankColor(user, false) }]}
      OverlapComponents={
        <>
          <View style={styles.iconContainer}>
            <TouchableEx onPress={onPressIcon} onLongPress={onLongPressIcon}>
              <CachedImage
                src={getUserIconUrl(user, true)}
                style={[
                  styles.icon,
                  {
                    borderColor: theme.colors.card,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              />
            </TouchableEx>
          </View>
          <View style={styles.underRowContainer}>
            <View style={styles.statusContainer}>
              <IconSymbol
                name="circle"
                size={fontSize.medium}
                style={{ color: getStatusColor(user) }}
              />
              <Text style={styles.status}>{user.statusDescription}</Text>
            </View>
            <View style={styles.badgesContainer}></View>
          </View>
        </>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingLeft: "30%",
    // for status spacing
    paddingBottom: fontSize.large + spacing.medium * 2 + spacing.small,
  },
  name: {
    flex: 1,
    fontSize: fontSize.large,
  },
  iconContainer: {
    position: "absolute",
    width: "30%",
    // aspectRatio: 1,
    padding: spacing.small,
    bottom: 0,
    left: 0,
    // for status spacing
    paddingBottom: fontSize.large + spacing.small * 2,

  },
  icon: {
    aspectRatio: 1,
    overflow: "hidden",
    borderWidth: 3,
    borderRadius: radius.all,
  },
  underRowContainer: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    width: "100%",

  },
  statusContainer: {
    display: "flex",
    flexDirection: "row",
    width: "70%",
    alignItems: "center",
    paddingHorizontal: spacing.medium,
    // borderColor: "red",borderWidth: 1,borderStyle: "solid",
  },
  status: {
    display: "flex",
    padding: spacing.small,
    fontSize: fontSize.medium,
  },
  badgesContainer: {
    display: "flex",
    flexDirection: "row",
    width: "30%",
    alignItems: "center",
    paddingHorizontal: spacing.medium,
    // borderColor: "blue",borderWidth: 1,borderStyle: "solid",
  },
});
export default CardViewUserDetail;
