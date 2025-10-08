import { spacing } from "@/configs/styles";
import { LimitedUserInstance } from "@/vrchat/api";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getInstanceType, InstanceLike, parseInstanceId, parseLocationString, UserLike, WorldLike } from "@/libs/vrchat";
import { useCache } from "@/contexts/CacheContext";
import { LinearGradient } from 'expo-linear-gradient';
import BaseCardView from "../BaseCardView";
import UserChip from "../../chip-badge/UserChip";
import IconButton from "../../icon-components/IconButton";
import { routeToWorld } from "@/libs/route";


interface Props {
  instance: InstanceLike; 
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: InstanceLike) => {
  const url = data?.world?.imageUrl;
  if (url && url.length > 0) return url;
  return "";
};
const extractTitle = (data: InstanceLike) => { // <instanceName> <worldName>
  const parsedInstance = parseInstanceId(data.instanceId ?? data.id ?? parseLocationString(data.location).parsedLocation?.instanceId);
  if (parsedInstance) {
    const instType = getInstanceType(parsedInstance.type, parsedInstance.groupAccessType);
    return `${instType} #${parsedInstance.name}${data.displayName ? `  (${data.displayName})` : ""}\n${data.world?.name}`;
  }
  return data.world?.name ?? "Unknown";
};

const CardViewInstanceDetail = ({ instance, onPress, onLongPress, ...rest }: Props) => {
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
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  gradient: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    aspectRatio: 2,
  },
  image: {
    aspectRatio: 2,
    resizeMode: "cover",
  },
  chip: {
    marginVertical: spacing.mini,
  },
});
 
export default React.memo(CardViewInstanceDetail);
