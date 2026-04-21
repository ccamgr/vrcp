import { spacing } from "@/configs/styles";
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  getInstanceType,
  InstanceLike,
  parseInstanceId,
  parseLocationString
} from "@/lib/vrchat";
import BaseCardView from "../BaseCardView";
import { useWorld } from "@/hooks/vrc/useWorld";

interface Props {
  instance: InstanceLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

/**
 * Extract image URL from instance or fetched world data
 */
const extractImageUrl = (data: InstanceLike, world?: any) => {
  const url = data?.world?.imageUrl ?? world?.imageUrl;
  return url && url.length > 0 ? url : "";
};

/**
 * Extract title string including instance type, name, and world name
 */
const extractTitle = (data: InstanceLike, world?: any) => {
  const location = data.instanceId ?? data.id ?? parseLocationString(data.location).parsedLocation?.instanceId;
  const parsedInstance = parseInstanceId(location);
  const worldName = data.world?.name ?? world?.name ?? "Unknown";

  if (parsedInstance) {
    const instType = getInstanceType(parsedInstance.type, parsedInstance.groupAccessType);
    const displayName = data.displayName ? ` (${data.displayName})` : "";
    return `${instType} #${parsedInstance.name}${displayName}\n${worldName}`;
  }
  return worldName;
};

const CardViewInstanceDetail = ({ instance, onPress, onLongPress, ...rest }: Props) => {
  // 1. Fetch world data if not present in the instance object
  const { data: fetchedWorld } = useWorld(instance.world ? undefined : instance.worldId);

  // 2. Resolve the world object
  const world = useMemo(() => instance.world ?? fetchedWorld, [instance.world, fetchedWorld]);

  // 3. Declarative data extraction
  const imageUrl = useMemo(() => extractImageUrl(instance, world), [instance, world]);
  const title = useMemo(() => extractTitle(instance, world), [instance, world]);

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
  image: {
    aspectRatio: 2,
    resizeMode: "cover",
  },
});

export default React.memo(CardViewInstanceDetail);
