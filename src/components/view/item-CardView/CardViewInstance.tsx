import { fontSize, spacing } from "@/configs/styles";
import { LimitedUserInstance } from "@/vrchat/api";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import BaseCardView from "./BaseCardView";
import { getInstanceType, InstanceLike, parseInstanceId, parseLocationString, UserLike, WorldLike } from "@/libs/vrchat";
import { useCache } from "@/contexts/CacheContext";
import UserChip from "../chip-badge/UserChip";
import { LinearGradient } from 'expo-linear-gradient';


interface Props {
  instance: InstanceLike; 
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: InstanceLike) => {
  const url = data?.world?.thumbnailImageUrl ?? data?.world?.imageUrl;
  if (url && url.length > 0) return url;
  return "";
};
const extractTitle = (data: InstanceLike) => { // <instanceName> <worldName>
  const parsedInstance = parseInstanceId(data.instanceId ?? data.id ?? parseLocationString(data.location).parsedLocation?.instanceId);
  if (parsedInstance) {
    const instType = getInstanceType(parsedInstance.type, parsedInstance.groupAccessType);
    return `${instType} #${parsedInstance.name}\n${data.world?.name}`;
  }
  return data.world?.name ?? "Unknown";
};

const CardViewInstance = ({ instance, onPress, onLongPress, ...rest }: Props) => {
  const cache = useCache();
  const [imageUrl, setImageUrl] = useState<string>(
    extractImageUrl(instance)
  );
  const [title, setTitle] = useState<string>(
    extractTitle(instance)
  );
  const fetchWorld = async () => {
    if (instance.world) {
      const url = extractImageUrl(instance);
      const title = extractTitle(instance);
      setImageUrl(url);
      setTitle(title);
    } else if (instance.worldId && instance.worldId.length > 0) {
      const world = await cache.world.get(instance.worldId);
      const title = extractTitle({ ...instance, world });
      const url = extractImageUrl({ ...instance, world });
      setImageUrl(url);
      setTitle(title);
    }
  };

  const friends = useMemo(() => {
    const users = instance.users ?? [];
    const friends = [] as LimitedUserInstance[];
    users.forEach((user) => {
      if (user.isFriend) {
        friends.push(user);
      }
    });
    return friends;
  }, [instance.users]);

  useEffect(() => {
    fetchWorld();
  }, [instance.world]);

  
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
            {friends.map((friend)=> (
              <UserChip key={friend.id} user={friend} size={fontSize.large * 1.2} textSize={fontSize.medium} style={styles.chip}/>
            ))}
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
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1,
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
  chip: {
    marginVertical: spacing.mini ,
  },
});
 
export default React.memo(CardViewInstance);
