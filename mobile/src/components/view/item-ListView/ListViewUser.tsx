import { radius, spacing } from "@/configs/styles";
import {
  getInstanceType,
  getStatusColor,
  getUserIconUrl,
  parseInstanceId,
  parseLocationString,
  UserLike,
} from "@/lib/vrchat";
import { World } from "@/generated/vrcapi";
import { useTheme } from "@react-navigation/native";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import BaseListView from "./BaseListView";
import CachedImage from "@/components/CachedImage";
import { useWorld } from "@/hooks/vrc/useWorld";

interface Props {
  user: UserLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractTitle = (data: UserLike) => data.displayName;

/**
 * 以前の extractSubtitles をフックと使いやすいように調整
 */
const getSubtitles = (data: UserLike, world?: World) => {
  const statusText = data.statusDescription !== "" ? data.statusDescription : data.status;
  let locationText = "unknown";

  // location プロパティの存在を確認してパース
  const location = (data as any).location;
  if (location) {
    const { isOffline, isPrivate, isTraveling, parsedLocation } = parseLocationString(location);

    if (isOffline) locationText = "* user is offline *";
    else if (isPrivate) locationText = "* user is in a private instance *";
    else if (isTraveling) locationText = "* user is now traveling... *";
    else if (parsedLocation) {
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

  // 1. location から worldId を抽出
  const location = (user as any).location;
  const worldId = useMemo(() => {
    const { parsedLocation } = parseLocationString(location);
    return parsedLocation?.worldId;
  }, [location]);

  // 2. useWorld フックを使用してワールド情報を取得（キャッシュがあれば即座に返る）
  const { data: worldData } = useWorld(worldId);

  // 3. サブタイトルの計算（メモ化）
  const subtitles = useMemo(() =>
    getSubtitles(user, worldData),
    [user, worldData]
  );

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
      }
      {...rest}
    />
  );
};

const _defaultHeight = 65;
const styles = StyleSheet.create({
  container: {
    height: _defaultHeight,
    paddingLeft: _defaultHeight,
  },
  title: {},
  subtitle: {},
  iconContainer: {
    position: "absolute",
    height: "100%",
    aspectRatio: 1,
    padding: spacing.small,
    bottom: 0,
    left: 0,
  },
  icon: {
    aspectRatio: 1,
    overflow: "hidden",
    borderWidth: 3,
    borderRadius: radius.all,
  },
});

export default React.memo(ListViewUser);
