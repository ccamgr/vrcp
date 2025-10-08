import { spacing } from "@/configs/styles";
import { getInstanceType, InstanceLike, WorldLike } from "@/libs/vrchat";
import { Instance } from "@/vrchat/api";
import { StyleSheet, View } from "react-native";
import RegionBadge from "../chip-badge/RegionBadge";
import BaseListView from "./BaseListView";
import { CachedImage } from "@/contexts/CacheContext";




interface Props {
  world: WorldLike;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: WorldLike) =>
  `${data.name}`;
const extractSubtitles = (data: WorldLike) => [];

const ListViewWorld = ({
  world,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
  return (
    <BaseListView
      data={world}
      title={extractTitle}
      subtitles={extractSubtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      TitleStyle={styles.title}
      SubtitleStyle={styles.subtitle}
      OverlapComponents={
        <CachedImage src={world.imageUrl} style={styles.image} />
      }
      {...rest}
    />
  );
};

const _defaultHeight = 65; // default, height-based
const styles = StyleSheet.create({
  container: {
    height: _defaultHeight,
    padding: spacing.large,
    marginLeft: _defaultHeight * 1.5,
  },
  title: {
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1
  },
  subtitle: {
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1
  },
  image: {
    position: "absolute",
    height: "100%",
    aspectRatio: 1.5,
    left: 0,
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
});
export default ListViewWorld;
