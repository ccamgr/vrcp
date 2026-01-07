import globalStyles, { fontSize, spacing } from "@/configs/styles";
import { StyleSheet, View } from "react-native";
import BaseListView from "./BaseListView";
import { PipelineContent, PipelineMessage } from "@/generated/pipline/type";
import { formatToDateTimeStr } from "@/libs/date";
import { parseLocationString, UserLike, WorldLike } from "@/libs/vrchat";
import { extractPipelineMessageContent } from "@/libs/funcs/extractPipelineMessageContent";
import { useEffect, useState } from "react";
import { useCache } from "@/contexts/CacheContext";




interface Props {
  message: PipelineMessage;
  onPress?: () => void;
  onLongPress?: () => void;

  [key: string]: any;
}
const extractTitle = (data: PipelineMessage) => {
  const timestamp = data.timestamp ? formatToDateTimeStr(new Date(data.timestamp)) : "";
  return `${timestamp}  ${data.type}`
}
const extractSubtitles = (data: PipelineMessage, user?:UserLike, world?: WorldLike) => {
  const subtitles = extractPipelineMessageContent(data, user, world);
  // return [subtitles.join("  ")]
  return subtitles;
}

const ListViewPipelineMessage = ({
  message,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
  const { world, user } = useCache();
  const [subtitles, setSubtitles] = useState<string[]>(
    extractSubtitles(message)
  );

  useEffect(() => {
    const content = message.content as any
    const userId = content.userId as string ?? undefined;
    const worldId = content.location ? parseLocationString(content.location)?.parsedLocation?.worldId : undefined;
    Promise.all([
      !content.user?.displayName ? user.get(userId) : Promise.resolve(undefined),
      worldId ? world.get(worldId) : Promise.resolve(undefined)
    ])
    .then(([u, w]) => {
      setSubtitles(extractSubtitles(message, u, w));
    });
  }, [message])


  return (
    <BaseListView
      data={message}
      title={extractTitle}
      subtitles={subtitles}
      onPress={onPress}
      onLongPress={onLongPress}
      ContainerStyle={styles.container}
      TitleStyle={styles.title}
      SubtitleStyle={styles.subtitle}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.small,
  },
  subtitle: {
    fontSize: fontSize.medium,
    fontWeight: "normal"
  },
  title: {
    fontSize: fontSize.small,
    fontWeight: "normal"
  },
  overlap: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
});
export default ListViewPipelineMessage;
