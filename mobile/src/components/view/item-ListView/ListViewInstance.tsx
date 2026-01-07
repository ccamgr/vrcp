import { spacing } from "@/configs/styles";
import { getInstanceType, InstanceLike } from "@/libs/vrchat";
import { Instance } from "@/generated/vrcapi";
import { StyleSheet, View } from "react-native";
import RegionBadge from "../chip-badge/RegionBadge";
import BaseListView from "./BaseListView";




interface Props {
  instance: InstanceLike;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: InstanceLike) =>
  `${getInstanceType(data.type, data.groupAccessType)}  #${data.name}`;
const extractSubtitles = (data: InstanceLike) => [
  `${data.n_users} / ${data.capacity}`,
];

const ListViewInstance = ({
  instance,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
  return (
    <BaseListView
      data={instance}
      title={extractTitle}
      subtitles={extractSubtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      TitleStyle={styles.title}
      SubtitleStyle={styles.subtitle}
      OverlapComponents={
        <View style={styles.imageContainer}>
          <RegionBadge region={instance.region} />
        </View>
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
    marginRight: _defaultHeight,
  },
  title: {
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1
  },
  subtitle: {
    // borderColor: "blue", borderStyle: "dotted", borderWidth: 1
  },
  imageContainer: {
    position: "absolute",
    height: "100%",
    aspectRatio: 1,
    padding: spacing.large,
    right: 0,
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
});
export default ListViewInstance;
