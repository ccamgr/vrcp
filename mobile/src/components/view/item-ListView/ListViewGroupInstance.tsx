import { spacing } from "@/configs/styles";
import { GroupInstance } from "@/generated/vrcapi";
import { getInstanceType, parseInstanceId } from "@/lib/vrchat";
import { StyleSheet, View } from "react-native";
import CachedImage from "@/components/CachedImage";
import RegionBadge from "../chip-badge/RegionBadge";
import BaseListView from "./BaseListView";

interface Props {
  instance: GroupInstance;
  onPress?: () => void;
  onLongPress?: () => void;
}

const getParsedInstance = (instance: GroupInstance) =>
  parseInstanceId(instance.instanceId);

const extractTitle = (instance: GroupInstance) => instance.world.name;

const extractSubtitles = (instance: GroupInstance) => {
  const parsed = getParsedInstance(instance);
  return [
    `${getInstanceType(parsed?.type ?? "group", parsed?.groupAccessType)} #${parsed?.name ?? instance.instanceId}`,
    `${instance.memberCount} / ${instance.world.capacity}`,
  ];
};

const ListViewGroupInstance = ({
  instance,
  onPress,
  onLongPress,
}: Props) => {
  const parsed = getParsedInstance(instance);

  return (
    <BaseListView
      data={instance}
      title={extractTitle}
      subtitles={extractSubtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      OverlapComponents={
        <>
          <CachedImage
            src={instance.world.thumbnailImageUrl}
            style={styles.image}
          />
          <View style={styles.regionBadge}>
            <RegionBadge region={parsed?.region ?? "unknown"} />
          </View>
        </>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72,
    marginLeft: 72 * (16 / 9),
    padding: spacing.small,
  },
  image: {
    position: "absolute",
    height: "100%",
    aspectRatio: 16 / 9,
    left: 0,
  },
  regionBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: 24,
    width: 24,
    padding: spacing.mini,
  },
});

export default ListViewGroupInstance;
