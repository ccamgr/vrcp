import GenericScreen from "@/components/layout/GenericScreen";
import CardViewInstance from "@/components/view/item-CardView/CardViewInstance";
import ListViewPipelineMessage from "@/components/view/item-ListView/ListViewPipelineMessage";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import SeeMoreContainer from "@/features/home/SeeMoreContainer";
import { calcFriendsLocations } from "@/libs/funcs/calcFriendLocations";
import { routeToInstance } from "@/libs/route";
import { InstanceLike } from "@/libs/vrchat";
import { PipelineMessage } from "@/vrchat/pipline/type";
import { useTheme } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";



export default function Feeds() {
  const theme = useTheme();
  const {pipeline} = useVRChat();


  const [feeds, setFeeds] = useState<PipelineMessage[]>([]);
  useEffect(() => {
    if (pipeline.lastMessage) {
      if (feeds.find(msg => msg.timestamp == pipeline.lastMessage?.timestamp && msg.type == pipeline.lastMessage?.type)) {
        return;
      }
      setFeeds((prev) => [pipeline.lastMessage!, ...prev].slice(0, 20));
    }
  }, [pipeline.lastMessage]);

  return (
    <GenericScreen>
      <View style={styles.container} >
        <FlatList
          data={feeds}
          keyExtractor={(item) => `${item.timestamp}-${item.type}`}
          renderItem={({ item }) => (
            <ListViewPipelineMessage message={item} style={styles.feed} />
          )} 
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", marginTop: spacing.large }}>
              <Text style={{ color: theme.colors.text }}>No feeds available.</Text>
            </View>
          )}
          numColumns={1}
          contentContainerStyle={styles.flatlistInner}
        />
      </View>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatlistInner: {
    paddingTop: spacing.medium,
    paddingBottom: navigationBarHeight
  },
  feed: {
    width: "100%",
  },
  cardView: {
    width: "50%",
  },
});