import EventDetailModal from "@/components/features/events/EventDetailModal";
import GenericScreen from "@/components/layout/GenericScreen";
import MonthlyCalendarView from "@/components/view/calendarView/MonthlyColendarView";
import ListViewEvent from "@/components/view/item-ListView/ListViewEvent";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { formatToDateStr, formatToTimeStr, getDayOfWeekStr } from "@/libs/date";
import { extractErrMsg } from "@/libs/utils";
import { CalendarEvent, PaginatedCalendarEventList } from "@/vrchat/api";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";



export default function Events () {
  const auth = useAuth();
  const theme = useTheme();
  const vrc = useVRChat();
  const { showToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const eventsRef = useRef<CalendarEvent[]>([]);
  const [ eventsByDate, setEventsByDate ] = useState<Record<string, CalendarEvent[]>>({});
  const offset = useRef(0);
  const fetchingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const npr = 60;
  const isReadyRef = useRef(false);

  const [ eventDetailModal, setEventDetailModal ] = useState<{ open: boolean; event: CalendarEvent | null }>({ open: false, event: null });

  const getDateKey = (date: Date) => {
    const res = formatToDateStr(date);
    return res;
  }

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const date = getDateKey(new Date(event.startsAt ?? ""))
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  const fetchEvents = async () => {
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      // adjust to UTC to avoid timezone issues
      const targetMonth = new Date(selectedMonth.getTime())
      targetMonth.setMinutes(targetMonth.getMinutes() - targetMonth.getTimezoneOffset());

      while (fetchingRef.current) {
        const res = await vrc.calendarApi.getCalendarEvents({
          date: targetMonth.toISOString(), // month only affects the returned events
          n: npr,
          offset: offset.current,
        });
        const paginated: PaginatedCalendarEventList = res.data;
        if (paginated.results) {
          eventsRef.current = [...eventsRef.current, ...paginated.results ?? []];
        }
        if (paginated.hasNext && (paginated.totalCount ?? 0 > offset.current + npr)) {
          offset.current += npr;
        } else {
          setEventsByDate(groupEventsByDate(eventsRef.current)); // update grouped events
          fetchingRef.current = false;
          isReadyRef.current = true;
          setIsLoading(false);
        }
      }
    } catch (e) {
      fetchingRef.current = false;
      setIsLoading(false);
      showToast("error", "Error fetching calendar events", extractErrMsg(e));
    }
  };

  const reload = () => {
    eventsRef.current = [];
    offset.current = 0;
    void fetchEvents();
  };

  useEffect(() => {
    reload();
  },[auth.user, selectedMonth]);

  const selectedDateEvents = useMemo<CalendarEvent[]>(() => {
    const dateKey = getDateKey(selectedDate);
    return eventsByDate[dateKey] || [];
  }, [selectedDate]);
  useEffect(() => {
    if (isReadyRef.current) {
      console.log("Reset selected date to today");
      setSelectedDate(new Date());
    }
  }, [isReadyRef.current]);

  const renderDateContent = useCallback((date: Date) => {
    const dateKey = getDateKey(date);
    const events = eventsByDate[dateKey] || [];
    if (events.length > 0) {
      return (
        <Text style={{ fontSize: 10, color: theme.colors.warning, paddingHorizontal: spacing.mini }}>
          {`${events.length} event${events.length > 1 ? "s" : ""}`}
        </Text>
      );
    }
    return null;
  }, [eventsByDate])

  const renderItem = useCallback(({ item }: { item: CalendarEvent }) => {
    return (
      <ListViewEvent style={styles.listview} event={item} onPress={() => setEventDetailModal({ open: true, event: item })} />
    );
  }, []);
  
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>No events available.</Text>
    </View>
  ), [theme.colors.text]);

  return (
    <GenericScreen>
      <View>
        {isLoading && <LoadingIndicator absolute />}
        <MonthlyCalendarView
          initialDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={setSelectedMonth}
          renderDateContent={renderDateContent}
        />
      </View>
      <Text style={[{ marginTop: spacing.medium, marginLeft: spacing.small, color: theme.colors.text, fontWeight: "bold", fontSize: 16 }]}>
        Events on {formatToDateStr(selectedDate)} 
      </Text>
      
      <FlatList
        data={selectedDateEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={1}
        // onRefresh={reload}
        // refreshing={isLoading}
      />

      <EventDetailModal event={eventDetailModal.event} open={eventDetailModal.open} setOpen={(v) => setEventDetailModal((prev) => ({ ...prev, open: v }))} />
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  listview: {
    width: "100%",
  }
});