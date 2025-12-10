import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import IconSymbol from "@/components/view/icon-components/IconView";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { CachedImage } from "@/contexts/CacheContext";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { formatToDateStr, formatToDateTimeStr, formatToTimeStr, isSameDate } from "@/libs/date";
import { getStatusColor } from "@/libs/vrchat";
import { CalendarEvent, UserStatus } from "@/vrchat/api";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { date } from "drizzle-orm/mysql-core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";

interface Props {
  event: CalendarEvent | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const EventDetailModal = ({ event, open, setOpen }: Props) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const footerButtons: ButtonItemForFooter[] = [];

  return (
    <GenericModal showCloseButton buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>
      {isLoading && <LoadingIndicator absolute />}
      {event && (
        <View style={[styles.container]}>
          <CachedImage src={event.imageUrl ?? ""} style={styles.image} />
          <Text style={[styles.dateText, { color: theme.colors.text }]}>
            {event.startsAt && event.endsAt && (
              isSameDate(new Date(event.startsAt), new Date(event.endsAt))
              ? t("components.eventDetailModal.eventTime_sameDay", {start: new Date(event.startsAt), end: new Date(event.endsAt)})
              : t("components.eventDetailModal.eventTime_differentDay", {start: new Date(event.startsAt), end: new Date(event.endsAt)})
            )}
          </Text>
          <Text style={[styles.titleText, { color: theme.colors.text }]}>{event.title}</Text>
          <ScrollView style={styles.descripContainer}>
            <Text style={[styles.descriptionText, { color: theme.colors.subText }]}>{event.description}</Text> 
          </ScrollView>
        </View> 
      )}
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    resizeMode: "cover",
  },
  dateText: {
    marginTop: spacing.small,
    fontSize: fontSize.small,
  },
  titleText: {
    marginTop: spacing.small,
    fontSize: fontSize.medium,
  },
  descriptionText: {
    marginTop: spacing.medium,
    fontSize: fontSize.small,
  },
  descripContainer: {
    maxHeight: 300,
    height: 100,
    marginTop: spacing.medium,
  },
  
});

export default EventDetailModal;
