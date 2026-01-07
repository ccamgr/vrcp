import { radius, spacing } from "@/configs/styles";
import { CachedImage, useCache } from "@/contexts/CacheContext";
import {
  getInstanceType,
  getStatusColor,
  getUserIconUrl,
  parseInstanceId,
  parseLocationString,
  UserLike,
} from "@/libs/vrchat";
import { World } from "@/generated/api";
import { useTheme } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import BaseListView from "./BaseListView";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  user: UserLike;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: UserLike) => data.displayName;
const extractSubtitles = (data: UserLike, world?: World) => {
  const statusText =
    data.statusDescription !== "" ? data.statusDescription : data.status;
  let locationText = "unknown";
  if (Object(data).hasOwnProperty("location")) {
    const { isOffline, isPrivate, isTraveling, parsedLocation } =
      parseLocationString(Object(data).location);
    if (isOffline) locationText = "* user is offline *";
    if (isPrivate) locationText = "* user is in a private instance *";
    if (isTraveling) locationText = "* user is now traveling... *";
    if (parsedLocation) {
      const parsedInstance = parseInstanceId(parsedLocation.instanceId);
      const worldName = world?.name ?? "";
      const instanceType = parsedInstance
        ? getInstanceType(parsedInstance.type, parsedInstance.groupAccessType)
        : "";
      const instanceStr = parsedInstance ? `#${parsedInstance.name}` : "";
      locationText = `${instanceType} ${instanceStr}  ${worldName}`.trim();
    }
  }
  return [statusText, locationText];
};

const ListViewUser = ({ user, onPress, onLongPress, ...rest }: Props) => {
  const theme = useTheme();
  const { showToast } = useToast();
  const { world } = useCache();
  const [subtitles, setSubtitles] = useState<string[]>(extractSubtitles(user));
  // ワールド情報をキャッシュから取得してサブタイトルを更新
  useEffect(() => {
    const { parsedLocation } = parseLocationString(Object(user).location);
    if (!parsedLocation?.worldId) return;
    // get world data with using cache
    world
      .get(parsedLocation.worldId)
      .then((world) => {
        setSubtitles(extractSubtitles(user, world));
      })
      .catch((e) => {
        showToast("error", `Err fetching world on ListViewUser: ${parsedLocation.worldId}`);
      });
  }, [Object(user).location]);
  return (
    <BaseListView
      data={user}
      title={extractTitle}
      subtitles={subtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      TitleStyle={styles.title}
      SubtitleStyle={styles.subtitle}
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
export default React.memo(ListViewUser);
