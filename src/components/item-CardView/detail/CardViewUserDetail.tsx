import { fontSize, radius, spacing } from "@/config/styles";
import { CachedImage } from "@/contexts/ImageCacheContext";
import { getStatusColor, getTrustRankColor, UserLike } from "@/lib/vrchatUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import IconSymbol from "../../icon-components/IconView";
import BaseCardView from "../BaseCardView";

interface Props {
  user: UserLike;
  onPress?: () => void;
  onLongPress?: () => void;

  isMe?: boolean;

  [key: string]: any;
}
const extractImageUrl = (data: UserLike) => data.profilePicOverride !== "" ? data.profilePicOverride : data.currentAvatarImageUrl ?? "";
const extractTitle = (data: UserLike) => data.displayName;

const CardViewUserDetail = ({ user, onPress, onLongPress, isMe = false, ...rest }: Props) => {
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
            <CachedImage
              src={user.userIcon.length > 0 ? user.userIcon : user.currentAvatarThumbnailImageUrl ?? ""}
              style={[styles.icon, { borderColor: theme.colors.card, backgroundColor: theme.colors.card }]}
            />
          </View>
          <View style={styles.underRowContainer}>
            <View style={styles.statusContainer}>
              <IconSymbol name="circle" size={fontSize.medium} style={{color: getStatusColor(user)}} /> 
              <Text style={styles.status}>
                {user.statusDescription}
              </Text>
            </View>
            <View style={styles.badgesContainer}>

            </View>
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
    paddingBottom: fontSize.large + spacing.small * 2
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
    width: "100%"
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
  }
});
export default CardViewUserDetail;