import GenericScreen from "@/components/layout/GenericScreen";
import { MenuItem } from "@/components/layout/type";
import MonthlyCalendarView from "@/components/view/calendarView/MonthlyColendarView";
import ListViewEvent from "@/components/view/item-ListView/ListViewEvent";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useSideMenu } from "@/contexts/AppMenuContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { getDateKey, restoreDateKey } from "@/lib/date";
import { routeToEvent } from "@/lib/route";
import { extractErrMsg } from "@/lib/utils";
import { CalendarEvent, PaginatedCalendarEventList } from "@/generated/vrcapi";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { isSameMonth, set } from "date-fns";
import { se } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, ScrollView, SectionList, StyleSheet, View, ViewToken } from "react-native";



export default function EventCalendar () {
  const auth = useAuth();
  const theme = useTheme();
  const vrc = useVRChat();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedMonth, setSelectedMonth] = useState<Date>(today);
  const sectionListRef = useRef<SectionList<CalendarEvent, { key: string, data: CalendarEvent[] }>>(null);
  const [ eventsByDate, setEventsByDate ] = useState<Record<string, CalendarEvent[]>>({});
  const offset = useRef(0);
  const eventsRef = useRef<CalendarEvent[]>([]); // all fetched events
  const fetchingRef = useRef(false); // to all fetch
  const [isLoading, setIsLoading] = useState(false);
  const npr = 60;

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
      const targetMonth = new Date(selectedMonth.getTime());
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
    if (!auth.user) return;
    reload();
  },[auth.user, selectedMonth]);


  const sections = useMemo(() => {
    const res = Object.entries(eventsByDate)
      .filter(([key, _]) => (isSameMonth(restoreDateKey(key), selectedMonth)))
      .map(([key, events]) => ({
      data: events,
      key: key,
    }))
    return res;
  }, [eventsByDate]);

  const onSelectDate = (date: Date) => {
    setSelectedDate(date);
    // Find the section index (first section with after or equal date)
    const dateKey = getDateKey(date);
    const sectionIndex = sections.findIndex(section => section.key >= dateKey);
    if (sectionIndex !== -1) {
      setTimeout(() => {
        sectionListRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          animated: true,
        });
      }, 100);
    }
  };

  const renderDateContent = useCallback((date: Date) => {
    if (isSameMonth(date, selectedMonth)) {
      const dateKey = getDateKey(date);
      const events = eventsByDate[dateKey] || [];
      if (events.length > 0) {
        return (
          <Text style={{ fontSize: 10, color: theme.colors.warning, paddingHorizontal: spacing.mini }}>
            {t("pages.calendar.calendar_date_event_count", { count: events.length })}
          </Text>
        );
      }
    }
    return null;
  }, [eventsByDate]);

  const renderItem = useCallback(({ item }: { item: CalendarEvent }) => {
    return (
      <ListViewEvent
        style={styles.listview}
        event={item}
        onPress={() => item.ownerId && routeToEvent(item.ownerId, item.id)}
        // onPress={() => setEventDetailModal({ open: true, event: item })}
      />
    );
  }, []);

  const renderSectionHeader = useCallback(({section}: { section: { key: string; data: CalendarEvent[] } }) => (
    <View >
      <Text style={[styles.sectionHeader, { color: (section.key === getDateKey(selectedDate)) ? theme.colors.primary : theme.colors.text }]}>
        {t("pages.calendar.selected_month_events_day_label", { date: restoreDateKey(section.key ?? "") })}
      </Text>
    </View>
  ), [selectedDate]);

  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>{t("pages.calendar.no_events")}</Text>
    </View>
  ), [theme.colors.text, t]);


  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: "circle-medium",
      title: "SUBSCRIBING EVENTS",
      // onPress: () => {},
    }
  ], []);
  useSideMenu(menuItems);

  return (
    <GenericScreen>
      <View style={styles.calendarContainer}>
        {isLoading && <LoadingIndicator absolute />}
        <MonthlyCalendarView
          initialDate={today}
          onSelectDate={onSelectDate}
          onChangeMonth={setSelectedMonth}
          renderDateContent={renderDateContent}
        />
      </View>
      <Text style={[{ marginTop: spacing.medium, marginLeft: spacing.small, color: theme.colors.text, fontWeight: "bold", fontSize: 16 }]}>
        {t("pages.calendar.selected_month_events", { date: selectedMonth })}
      </Text>

      <SectionList
        sections={sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyComponent}
        ref={sectionListRef}
        contentContainerStyle={styles.scrollViewContentContainer}
      />

    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  listview: {
    width: "100%",
  },
  calendarContainer: {
    minHeight: 250,
    height: "40%",
    maxHeight: 350,
  },
  sectionHeader: {
    paddingTop: spacing.medium,
    paddingBottom: spacing.mini,
    fontWeight: "bold"
  },
  scrollViewContentContainer: {
    paddingBottom: navigationBarHeight,
  },
});
