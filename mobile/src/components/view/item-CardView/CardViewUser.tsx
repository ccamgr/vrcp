import { radius, spacing } from "@/configs/styles";
import { CachedImage } from "@/contexts/CacheContext";
import { getStatusColor, getUserIconUrl, getUserProfilePicUrl, UserLike } from "@/lib/vrchat";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import BaseCardView from "./BaseCardView";
import React from "react";

interface Props {
  user: UserLike;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractImageUrl = (data: UserLike) => getUserProfilePicUrl(data);
const extractTitle = (data: UserLike) => data.displayName;

const CardViewUser = ({ user, onPress, onLongPress, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <BaseCardView
      data={user}
      imageUrl={extractImageUrl}
      title={extractTitle}
      onPress={onPress}
      onLongPress={onLongPress}
      FooterStyle={styles.footer}
      // NameStyle={{ color: getTrustRankColor(user, false) }}
      OverlapComponents={
        <View style={styles.iconContainer}>
          <CachedImage
            src={getUserIconUrl(user)}
            style={[
              styles.icon,
              {
                borderColor: getStatusColor(user),
                backgroundColor: theme.colors.card,
              },
            ]}
          />
        </View>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingLeft: "30%",
  },
  iconContainer: {
    position: "absolute",
    width: "30%",
    aspectRatio: 1,
    padding: spacing.small,
    bottom: 0,
    left: 0,
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
  icon: {
    aspectRatio: 1,
    overflow: "hidden",
    borderWidth: 3,
    borderRadius: radius.all,
  },
});
export default React.memo(CardViewUser);
