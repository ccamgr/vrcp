import { spacing } from "@/configs/styles";
import { getInstanceType, InstanceLike, WorldLike } from "@/libs/vrchat";
import { CalendarEvent, Instance } from "@/vrchat/api";
import { StyleSheet, View } from "react-native";
import RegionBadge from "../chip-badge/RegionBadge";
import BaseListView from "./BaseListView";
import { CachedImage } from "@/contexts/CacheContext";
import { formatToTimeStr } from "@/libs/date";




interface Props {
  event: CalendarEvent;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: CalendarEvent) =>
  `${data.title}`;
const extractSubtitles = (data: CalendarEvent) => [
  `${formatToTimeStr(data.startsAt ?? "")} - ${formatToTimeStr(data.endsAt ?? "")}`,
  data.description ?? "",
];

const ListViewEvent = ({
  event,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
  return (
    <BaseListView
      data={event}
      title={extractTitle}
      subtitles={extractSubtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      TitleStyle={styles.title}
      SubtitleStyle={styles.subtitle}
      OverlapComponents={
        <CachedImage src={event.imageUrl ?? ""} style={styles.image} />
      }
      {...rest}
    />
  );
};

const _defaultHeight = 65; // default, height-based
const styles = StyleSheet.create({
  container: {
    height: _defaultHeight,
    padding: spacing.medium,
    marginLeft: _defaultHeight * 16 / 9,
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
    aspectRatio: 16 / 9,
    left: 0,
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
});
export default ListViewEvent;
