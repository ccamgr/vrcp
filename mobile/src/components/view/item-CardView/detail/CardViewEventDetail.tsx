import { spacing } from "@/configs/styles";
import { CalendarEvent } from "@/generated/vrcapi";
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { isSameDay } from "date-fns";
import BaseCardView from "../BaseCardView";

interface Props {
  event: CalendarEvent;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const CardViewEventDetail = ({ event, onPress, onLongPress, ...rest }: Props) => {
  const { t } = useTranslation();

  // 1. Image URL derivation
  const imageUrl = useMemo(() => {
    return event?.imageUrl ?? "";
  }, [event?.imageUrl]);

  // 2. Title derivation (including date formatting)
  const title = useMemo(() => {
    const eventTitle = event.title ?? "Untitled Event";

    if (!event.startsAt || !event.endsAt) {
      return eventTitle;
    }

    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);

    const timeRangeStr = isSameDay(start, end)
      ? t("common.dateFormats.dateTimeRange_sameDay", { start, end })
      : t("common.dateFormats.dateTimeRange_diffDay", { start, end });

    return `${timeRangeStr}\n${eventTitle}`;
  }, [event, t]);

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
  image: {
    aspectRatio: 2,
    resizeMode: "cover",
  },
});

export default React.memo(CardViewEventDetail);
