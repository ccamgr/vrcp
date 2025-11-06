import GenericScreen from "@/components/layout/GenericScreen";
import CardViewInstance from "@/components/view/item-CardView/CardViewInstance";
import ListViewPipelineMessage from "@/components/view/item-ListView/ListViewPipelineMessage";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import SeeMoreContainer from "@/components/features/home/SeeMoreContainer";
import { calcFriendsLocations } from "@/libs/funcs/calcFriendLocations";
import { routeToFeeds, routeToFriendLocations, routeToInstance, routeToWorld } from "@/libs/route";
import { InstanceLike } from "@/libs/vrchat";
import { PipelineMessage } from "@/vrchat/pipline/type";
import { useTheme } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { Setting, useSetting } from "@/contexts/SettingContext";
import { CalendarEvent, PaginatedCalendarEventList } from "@/vrchat/api";

export default function Home() {
  const theme = useTheme();
  const { settings } = useSetting();
  const { homeTabMode, cardViewColumns } = settings.uiOptions.layouts;
 
  return (
    <GenericScreen>
      { homeTabMode === "feeds" ? (
        <>
          <FeedArea />
        </>
      ) : homeTabMode === "calendar" ? (
        <>
          <CalendarArea />
        </>
      ) : homeTabMode === "friend-locations" ? (
        <>
          <FriendLocationArea />
        </>
      ) : ( // default mode
        <>
          <FeedArea
            style={styles.area30}
          />
          <FriendLocationArea
            style={styles.area70}
          />
        </>
      )}
    </GenericScreen>
  );
}


const FeedArea = memo(({style}: { style?: any }) => {
  const theme = useTheme();
  const { pipelineMessages } = useData();

  const renderItem = useCallback(({ item }: { item: PipelineMessage }) => (
    <ListViewPipelineMessage message={item} style={styles.feed} />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>No feeds available.</Text>
    </View>
  ), [theme.colors.text]);
  return (
    <SeeMoreContainer
      title="Feeds"
      onPress={() => routeToFeeds()}
      style={style}
    >
      <FlatList
        data={pipelineMessages}
        keyExtractor={(item) => `${item.timestamp}-${item.type}`}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={1}
      />
    </SeeMoreContainer>
  );
});

const FriendLocationArea = memo(({ style }: { style?: any }) => {
  const theme = useTheme();
  const { friends, favorites } = useData();

  const instances = useMemo<InstanceLike[]>(() => {
      return calcFriendsLocations(friends.data, favorites.data, true, false);
  }, [friends.data, favorites.data]);

  const renderItem = useCallback(({ item }: { item: InstanceLike }) => (
    <CardViewInstance instance={item} style={styles.cardView} onPress={() => routeToInstance(item.worldId, item.instanceId)} />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={{ alignItems: "center", marginTop: spacing.large }}>
      <Text style={{ color: theme.colors.text }}>No friends online in instances.</Text>
    </View>
  ), [theme.colors.text]);
  return (
    <SeeMoreContainer
      title="Friends Locations"
      onPress={() => routeToFriendLocations()}
      style={style}
    >
      <FlatList
        data={instances}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={emptyComponent}
        numColumns={2}
        onRefresh={friends.fetch}
        refreshing={friends.isLoading}
      />
    </SeeMoreContainer>
  );
});

const CalendarArea = memo(({ style }: {
  style?: any
}) => {
  const theme = useTheme();
  const vrc = useVRChat();
  const [ events, setEvents ] = useState<CalendarEvent[]>([]);
  const offset = useRef(0);
  const fetchingRef = useRef(false);
  const npr = 100;
  const fetchEvents = async () => {
    fetchingRef.current = true;
    try {
      const res = await vrc.calendarApi.getCalendarEvents({
        date: new Date().toISOString(), // month only affects the returned events
        n: npr,
        offset: offset.current,
      });
      const paginated: PaginatedCalendarEventList = res.data;
      if (paginated.results) {
        setEvents(prev => [...prev, ...paginated.results ?? []]);
      }
      if (paginated.hasNext && (paginated.totalCount ?? 0 > offset.current + npr)) {
        offset.current += npr;
        void fetchEvents();
      } else {
        fetchingRef.current = false;
      }
    } catch (e) {
      fetchingRef.current = false;
      console.error("Error fetching calendar events:", e);
    }
  };

  const reload = () => {
    setEvents([]);
    offset.current = 0;
    void fetchEvents();
  };
  return (
    <></>
  );
} );


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.mini,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
  area30: {
    maxHeight: "30%"
  },
  area70: {
    maxHeight: "70%"
  },
  feed: {
    width: "100%",
  },
  cardView: {
    width: "50%",
  },
});