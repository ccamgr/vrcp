import { Instance } from "@/api/vrchat";
import { spacing } from "@/config/styles";
import { getInstanceType } from "@/lib/vrchatUtils";
import { StyleSheet, View } from "react-native";
import RegionBadge from "../chip-badge/RegionBadge";
import BaseListView from "./BaseListView";


// 最低限のInstance情報だけを持つ型 (Worldに付随した部分的なInstance情報に対応)
export type MinInstance = Pick<Instance, "id" | "name" | "n_users" | "capacity" | "type" | "groupAccessType" | "region">;

interface Props {
  instance: MinInstance;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: MinInstance) => `${getInstanceType(data.type, data.groupAccessType)}  #${data.name}`;
const extractSubtitles = (data: MinInstance) => [`${data.n_users} / ${data.capacity}`];

const ListViewInstance = ({ instance, onPress, onLongPress, ...rest }: Props) => {
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