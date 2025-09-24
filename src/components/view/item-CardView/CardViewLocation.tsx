import { spacing } from "@/config/styles";
import { Avatar, Instance, LimitedUserFriend } from "@/vrchat/api";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import ReleaseStatusChip from "../chip-badge/ReleaseStatusChip";
import BaseCardView from "./BaseCardView";
import { getInstanceType, parseInstanceId, parseLocationString, UserLike, WorldLike } from "@/lib/vrchatUtils";
import { useCache } from "@/contexts/CacheContext";
import UserChip from "../chip-badge/UserChip";
import { LinearGradient } from 'expo-linear-gradient';

export interface LocationData {
  location: string;
  friends?: UserLike[];
  friendsCount?: number;
  world?: WorldLike;
  instance?: Instance;
  hasFavoriteFriends?: boolean;
  isFavorite?: boolean;
}

interface Props {
  locationData: LocationData;
  instance?: Instance; // optional, if provided, use this instance data to show release status
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: LocationData) => {
  const url = data?.world?.thumbnailImageUrl ?? data?.world?.imageUrl;
  if (url && url.length > 0) return url;
  return "";
};
const extractTitle = (data: LocationData) => { // <instanceName> <worldName>
  const { parsedLocation } = parseLocationString(data.location);
  const parsedInstance = parseInstanceId(parsedLocation?.instanceId);
  if (parsedInstance) {
    const instType = getInstanceType(parsedInstance.type, parsedInstance.groupAccessType);
    return `${instType} #${parsedInstance.name}\n${data.world?.name}`;
  }
  return data.world?.name ?? "Unknown";
};

const CardViewLocation = ({ locationData, onPress, onLongPress, ...rest }: Props) => {
  const cache = useCache();
  const [imageUrl, setImageUrl] = useState<string>(
    extractImageUrl(locationData)
  );
  const [title, setTitle] = useState<string>(
    extractTitle(locationData)
  );

  const fetchData = async () => {
    if (locationData.world) {
      const url = extractImageUrl(locationData);
      const title = extractTitle(locationData);
      setImageUrl(url);
      setTitle(title);
    } else {
      const worldId = parseLocationString(locationData.location).parsedLocation?.worldId;
      if (!worldId) return;
      const world = await cache.world.get(worldId);
      const title = extractTitle({ ...locationData, world });
      const url = extractImageUrl({ ...locationData, world });
      setImageUrl(url);
      setTitle(title);
    }
  };

  useEffect(() => {
    fetchData();
  }, [locationData.world]);

  return (
    <BaseCardView
      data={locationData}
      onPress={onPress}
      onLongPress={onLongPress}
      imageUrl={imageUrl}
      title={title}
      numberOfLines={2}
      ImageStyle={styles.image}
      OverlapComponents={
        <>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
          <View style={styles.friendsContainer}>
            {locationData.friends?.map((friend)=> (
              <UserChip key={friend.id} user={friend} style={styles.chip}/>
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
    top: 0,
    right: 0,
    bottom: 0,
    width: "50%",
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1,
  },
  gradient: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    aspectRatio: 1,
  },
  image: {
    aspectRatio: 1,
  },
  chip: {
    marginVertical: spacing.mini,
  },
});
 
export default React.memo(CardViewLocation);
