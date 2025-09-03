import { radius, spacing } from "@/config/styles";
import { CachedImage } from "@/contexts/ImageCacheContext";
import { getInstanceType, getStatusColor, parseInstanceId, parseLocationString, UserLike } from "@/lib/vrchatUtils";
import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import BaseListView from "./BaseListView";

interface Props {
  user: UserLike;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: UserLike) => data.displayName;
const extractSubtitles = (data: UserLike) => {
  if (Object(data).hasOwnProperty("location")) {
    const { isOffline, isPrivate, parsedLocation } =  parseLocationString(Object(data).location);
    if (isOffline) return ["offline"];
    if (isPrivate) return ["private"];
    if (parsedLocation) {
      const parsedInstance = parseInstanceId(parsedLocation.instanceId);
      const worldName =  parsedLocation.worldId ? parsedLocation.worldId.slice(0, 30) + "..." : ""
      const instanceType = parsedInstance ? getInstanceType(parsedInstance.type, parsedInstance.groupAccessType) : "";
      const instanceStr = parsedInstance ? `#${parsedInstance.name}` : "";
      return [`${instanceType} ${instanceStr}  ${worldName}`];
    }
    return ["unknown"];
  } else {
    return ["unknown"];
  }
};

const ListViewUser = ({ user, onPress, onLongPress, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <BaseListView
      data={user}
      title={extractTitle}
      subtitles={extractSubtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      TitleStyle={styles.title}
      SubtitleStyle={styles.subtitle}
      OverlapComponents={
        <View style={styles.iconContainer}>
          <CachedImage
            src={user.userIcon.length > 0 ? user.userIcon : user.currentAvatarThumbnailImageUrl ?? ""}
            style={[styles.icon, { borderColor: getStatusColor(user), backgroundColor: theme.colors.card }]}
          />
        </View>
        // ToDo: isFavoriteIcon, 
      }
      {...rest}
    />
  );
};


const _defaultHeight = 65; // default, height-based
const styles = StyleSheet.create({
  container: {
    // aspectRatio: 6, paddingLeft: "17%",
    height: _defaultHeight,
    paddingLeft: _defaultHeight,
  },
  title: {
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1
  },
  subtitle: {
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1
  },
  iconContainer: {
    position: "absolute",
    height: "100%",
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
export default ListViewUser;