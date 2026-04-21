import { fontSize, spacing } from "@/configs/styles";
import { LimitedUserInstance } from "@/generated/vrcapi";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import BaseCardView from "./BaseCardView";
import { getInstanceType, InstanceLike, parseInstanceId, parseLocationString } from "@/lib/vrchat";
import UserOrGroupChip from "../chip-badge/UserOrGroupChip";
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useWorld } from "@/hooks/vrc/useWorld";

interface Props {
  instance: InstanceLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: InstanceLike, world?: any) => {
  const url = data?.world?.thumbnailImageUrl ?? data?.world?.imageUrl ?? world?.thumbnailImageUrl ?? world?.imageUrl;
  return url && url.length > 0 ? url : "";
};

const extractTitle = (data: InstanceLike, world?: any) => {
  const parsedInstance = parseInstanceId(data.instanceId ?? data.id ?? parseLocationString(data.location).parsedLocation?.instanceId);
  const worldName = data.world?.name ?? world?.name ?? "Unknown";

  if (parsedInstance) {
    const instType = getInstanceType(parsedInstance.type, parsedInstance.groupAccessType);
    return `${instType} #${parsedInstance.name}\n${worldName}`;
  }
  return worldName;
};

const CardViewInstance = ({ instance, onPress, onLongPress, ...rest }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // 1. Fetch world data if it's not present in the instance object
  // If instance.world already exists, we don't need to trigger the hook's fetch
  const { data: fetchedWorld } = useWorld(instance.world ? undefined : instance.worldId);

  // 2. Derive visual data using useMemo
  const world = instance.world ?? fetchedWorld;

  const imageUrl = useMemo(() => extractImageUrl(instance, world), [instance, world]);
  const title = useMemo(() => extractTitle(instance, world), [instance, world]);

  const friends = useMemo(() => {
    const users = instance.users ?? [];
    return users.filter((user) => user.isFriend) as LimitedUserInstance[];
  }, [instance.users]);

  return (
    <BaseCardView
      data={instance}
      onPress={onPress}
      onLongPress={onLongPress}
      imageUrl={imageUrl}
      title={title}
      numberOfLines={2}
      ImageStyle={styles.image}
      OverlapComponents={
        <>
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.8)']}
            start={{ x: 1.0, y: 0.0 }}
            end={{ x: 0.0, y: 0.0 }}
            locations={[0.0, 0.3, 0.6, 1.0]}
            style={styles.gradient}
          />
          <View style={styles.friendsContainer}>
            {friends.slice(0, 3).map((friend) => (
              <UserOrGroupChip key={friend.id} data={friend} size={fontSize.large * 1.2} textSize={fontSize.medium} />
            ))}
            {friends.length > 3 && (
              <Text style={[styles.moreText, { color: theme.colors.text }]}>
                {t("pages.home.friendLocation.more_friends_count", { count: friends.length - 3 })}
              </Text>
            )}
          </View>
        </>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  friendsContainer: {
    position: "absolute",
    paddingVertical: spacing.mini,
    top: 0,
    left: 0,
    right: 0,
    bottom: fontSize.large + fontSize.small + spacing.medium * 2,
    overflow: "hidden",
  },
  gradient: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    aspectRatio: 1.5,
  },
  image: {
    aspectRatio: 1.5,
    resizeMode: "cover",
  },
  moreText: {
    fontSize: fontSize.small,
    marginLeft: spacing.medium,
  },
});

export default React.memo(CardViewInstance);
