import { fontSize, spacing } from "@/configs/styles";
import { StyleSheet } from "react-native";
import BaseListView from "./BaseListView";
import { PipelineMessage } from "@/generated/vrcpipline/type";
import { formatDateTimeShort } from "@/lib/date";
import { parseLocationString, UserLike, WorldLike } from "@/lib/vrchat";
import { extractPipelineMessageContent } from "@/lib/funcs/extractPipelineMessageContent";
import { useMemo } from "react";
import { useUser } from "@/hooks/vrc/useUser";
import { useWorld } from "@/hooks/vrc/useWorld";

interface Props {
  message: PipelineMessage;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractTitle = (data: PipelineMessage) => {
  const timestamp = data.timestamp ? formatDateTimeShort(data.timestamp) : "";
  return `${timestamp}  ${data.type}`;
};

const ListViewPipelineMessage = ({
  message,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
  // 1. メッセージ内容から ID を抽出
  const content = message.content as any;
  const userId = content.userId as string | undefined;
  const location = content.location as string | undefined;
  const worldId = useMemo(() =>
    location ? parseLocationString(location)?.parsedLocation?.worldId : undefined,
    [location]
  );

  // 2. フックを使用して詳細データを取得
  // メッセージ内に既に displayName がある場合は fetch をスキップする最適化も可能ですが、
  // useUser がキャッシュを返すため、そのまま ID を渡すのが最もシンプルで安全です。
  const { data: user } = useUser(userId);
  const { data: world } = useWorld(worldId);

  // 3. サブタイトルの計算 (メモ化)
  // user や world が取得（キャッシュ復元）されるたびに自動的に再計算されます
  const subtitles = useMemo(() => {
    return extractPipelineMessageContent(message, user, world);
  }, [message, user, world]);

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
    fontWeight: "normal",
  },
  title: {
    fontSize: fontSize.small,
    fontWeight: "normal",
  },
});

export default ListViewPipelineMessage;
