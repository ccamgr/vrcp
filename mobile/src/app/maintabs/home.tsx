import GenericScreen from "@/components/layout/GenericScreen";
import CardViewInstance from "@/components/view/item-CardView/CardViewInstance";
import ListViewPipelineMessage from "@/components/view/item-ListView/ListViewPipelineMessage";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import SeeMoreContainer from "@/components/features/home/SeeMoreContainer";
import { calcFriendsLocations } from "@/lib/funcs/calcFriendLocations";
import {
  routeToCalendar,
  routeToEvent,
  routeToFeeds,
  routeToFriendLocations,
  routeToInstance,
  routeToWorld,
} from "@/lib/route";
import { InstanceLike } from "@/lib/vrchat";
import { PipelineMessage } from "@/generated/vrcpipline/type";
import { useLocale, useTheme } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Setting, useSetting } from "@/contexts/SettingContext";
import { CalendarEvent, PaginatedCalendarEventList } from "@/generated/vrcapi";
import { useToast } from "@/contexts/ToastContext";
import { extractErrMsg } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ListViewEvent from "@/components/view/item-ListView/ListViewEvent";
import ReleaseNote from "@/components/features/home/ReleaseNote";
import { useTranslation } from "react-i18next";
import { isSameDay } from "date-fns";
import { usePipeline } from "@/contexts/PipelineContext";
import { useFavFriends } from "@/hooks/vrc/useFavFriends";
import { useCurrentUser } from "@/hooks/vrc/useCurrentUser";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function Home() {
  const theme = useTheme();
  const { settings } = useSetting();
  const {
    uiOptions_homeTabTopVariant: homeTabTopVariant,
    uiOptions_homeTabBottomVariant: homeTabBottomVariant,
    uiOptions_homeTabSeparatePos: homeTabSeparatePos,
  } = settings;

  if (homeTabSeparatePos <= 0 || homeTabSeparatePos >= 100) {
    const singleVariant =
      homeTabSeparatePos >= 100 ? homeTabTopVariant : homeTabBottomVariant;
    return (
      <GenericScreen>
        {singleVariant === "feeds" ? (
          <FeedArea />
        ) : singleVariant === "friend-locations" ? (
          <FriendLocationArea />
        ) : singleVariant === "events" ? (
          <EventsArea />
        ) : null}

        <ReleaseNote />
      </GenericScreen>
    );
  }

  return (
    <GenericScreen>
      {homeTabTopVariant === "feeds" ? (
        <FeedArea style={{ maxHeight: `${homeTabSeparatePos}%` }} />
      ) : homeTabTopVariant === "friend-locations" ? (
        <FriendLocationArea style={{ maxHeight: `${homeTabSeparatePos}%` }} />
      ) : homeTabTopVariant === "events" ? (
        <EventsArea style={{ maxHeight: `${homeTabSeparatePos}%` }} />
      ) : null}

      {homeTabBottomVariant === "feeds" ? (
        <FeedArea style={{ maxHeight: `${100 - homeTabSeparatePos}%` }} />
      ) : homeTabBottomVariant === "friend-locations" ? (
        <FriendLocationArea
          style={{ maxHeight: `${100 - homeTabSeparatePos}%` }}
        />
      ) : homeTabBottomVariant === "events" ? (
        <EventsArea style={{ maxHeight: `${100 - homeTabSeparatePos}%` }} />
      ) : null}

      <ReleaseNote />
    </GenericScreen>
  );
}

const FeedArea = memo(function FeedArea({ style }: { style?: any }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { messages } = usePipeline();

  const renderItem = useCallback(
    ({ item }: { item: PipelineMessage }) => (
      <ListViewPipelineMessage message={item} style={styles.feed} />
    ),
    [],
  );
  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.home.no_feeds")}
        </Text>
      </View>
    ),
    [theme.colors.text, t],
  );
  return (
    <SeeMoreContainer
      title={t("pages.home.feeds_area")}
      onPress={() => routeToFeeds()}
      style={style}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => `${item.timestamp}-${item.type}`}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={1}
      />
    </SeeMoreContainer>
  );
});

const FriendLocationArea = memo(function FriendLocationArea({
  style,
}: {
  style?: any;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { data: favFriends, refetch } = useFavFriends();
  const { data: currentUser, refetch: refetchCurrentUser } = useCurrentUser();
  const refresh = useCallback(
    () => Promise.all([refetch(), refetchCurrentUser()]),
    [refetch, refetchCurrentUser],
  );
  const { isRefreshing, onRefresh } = usePullToRefresh(refresh);

  const instances = useMemo<InstanceLike[]>(() => {
    return calcFriendsLocations(favFriends, false, currentUser?.location);
  }, [currentUser?.location, favFriends]);

  const renderItem = useCallback(
    ({ item }: { item: InstanceLike }) => (
      <CardViewInstance
        instance={item}
        style={styles.cardView}
        onPress={() => routeToInstance(item.worldId, item.instanceId)}
      />
    ),
    [],
  );
  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.home.no_friendlocations")}
        </Text>
      </View>
    ),
    [theme.colors.text, t],
  );
  return (
    <SeeMoreContainer
      title={t("pages.home.friendlocations_area")}
      onPress={() => routeToFriendLocations()}
      style={style}
    >
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <FlatList
        data={instances}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={2}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
      />
    </SeeMoreContainer>
  );
});

const EventsArea = memo(function EventsArea({ style }: { style?: any }) {
  const auth = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const vrc = useVRChat();
  const { showToast } = useToast();
  const eventsRef = useRef<CalendarEvent[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const offset = useRef(0);
  const fetchingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const npr = 60;

  const [eventDetailModal, setEventDetailModal] = useState<{
    open: boolean;
    event: CalendarEvent | null;
  }>({ open: false, event: null });

  const fetchEvents = async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      // adjust to UTC to avoid timezone issues
      const targetMonth = new Date();
      targetMonth.setMinutes(
        targetMonth.getMinutes() - targetMonth.getTimezoneOffset(),
      );

      while (fetchingRef.current) {
        const res = await vrc.calendarApi.getCalendarEvents({
          date: targetMonth.toISOString(), // month only affects the returned events
          n: npr,
          offset: offset.current,
        });
        const paginated: PaginatedCalendarEventList = res.data;
        if (paginated.results) {
          eventsRef.current = [
            ...eventsRef.current,
            ...(paginated.results ?? []),
          ];
        }
        if (
          paginated.hasNext &&
          (paginated.totalCount ?? 0 > offset.current + npr)
        ) {
          offset.current += npr;
        } else {
          setTodayEvents(
            eventsRef.current.filter((event) =>
              isSameDay(new Date(event.startsAt ?? ""), new Date()),
            ),
          ); // update grouped events
          fetchingRef.current = false;
        }
      }
    } catch (e) {
      fetchingRef.current = false;
      showToast("error", "Error fetching calendar events", extractErrMsg(e));
    }
  };

  const reload = async () => {
    if (isRefreshing || fetchingRef.current) return;

    eventsRef.current = [];
    offset.current = 0;
    setIsRefreshing(true);
    try {
      await fetchEvents();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!auth.user) return;
    eventsRef.current = [];
    offset.current = 0;
    void fetchEvents();
  }, [auth.user]);

  const renderItem = useCallback(({ item }: { item: CalendarEvent }) => {
    return (
      <ListViewEvent
        style={styles.listview}
        event={item}
        onPress={() => item.ownerId && routeToEvent(item.ownerId, item.id)}
      />
    );
  }, []);

  const emptyComponent = useCallback(
    () => (
      <View style={{ alignItems: "center", marginTop: spacing.large }}>
        <Text style={{ color: theme.colors.text }}>
          {t("pages.home.no_events")}
        </Text>
      </View>
    ),
    [theme.colors.text, t],
  );

  return (
    <SeeMoreContainer
      title={t("pages.home.events_area")}
      onPress={() => routeToCalendar()}
      style={style}
    >
      {isRefreshing && <LoadingIndicator absolute overlayOnly />}
      <FlatList
        data={todayEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={1}
        onRefresh={reload}
        refreshing={isRefreshing}
      />
    </SeeMoreContainer>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.mini,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
  feed: {
    width: "100%",
  },
  listview: {
    width: "100%",
  },
  cardView: {
    width: "50%",
  },
});
