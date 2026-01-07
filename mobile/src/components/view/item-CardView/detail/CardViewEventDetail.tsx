import { spacing } from "@/configs/styles";
import { CalendarEvent } from "@/generated/vrcapi";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useCache } from "@/contexts/CacheContext";
import { LinearGradient } from 'expo-linear-gradient';
import BaseCardView from "../BaseCardView";
import UserOrGroupChip from "../../chip-badge/UserOrGroupChip";
import IconButton from "../../icon-components/IconButton";
import { routeToWorld } from "@/lib/route";
import { GroupLike } from "@/lib/vrchat";
import { useTranslation } from "react-i18next";
import { isSameDay } from "date-fns";


interface Props {
  event: CalendarEvent;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: CalendarEvent) => {
  const url = data?.imageUrl;
  if (url && url.length > 0) return url;
  return "";
};
const extractTitle = (data: CalendarEvent) => {
  const { t } = useTranslation();
  const timeRangeStr = (data.startsAt && data.endsAt) ? (
    isSameDay(new Date(data.startsAt), new Date(data.endsAt))
    ? t("common.dateFormats.dateTimeRange_sameDay", { start: new Date(data.startsAt), end: new Date(data.endsAt) })
    : t("common.dateFormats.dateTimeRange_diffDay", { start: new Date(data.startsAt), end: new Date(data.endsAt) })
  ) : ""
  return `${timeRangeStr}\n${data.title ?? "Untitled Event"}`;
};

const CardViewEventDetail = ({ event, onPress, onLongPress, ...rest }: Props) => {
  const cache = useCache();
  const [imageUrl, setImageUrl] = useState<string>(
    extractImageUrl(event)
  );
  const [title, setTitle] = useState<string>(
    extractTitle(event)
  );

  return (
    <BaseCardView
      data={event}
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

export default React.memo(CardViewEventDetail);
