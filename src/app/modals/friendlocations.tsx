import GenericScreen from "@/components/layout/GenericScreen";
import CardViewInstance from "@/components/view/item-CardView/CardViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import SeeMoreContainer from "@/features/home/SeeMoreContainer";
import { calcFriendsLocations } from "@/libs/funcs/calcFriendLocations";
import { routeToInstance } from "@/libs/route";
import { InstanceLike } from "@/libs/vrchat";
import { useTheme } from "@react-navigation/native";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";



export default function FriendLocations() {
  const theme = useTheme();
  const { friends, favorites } = useData();

  const instances = useMemo<InstanceLike[]>(() => {
    return calcFriendsLocations(friends.data, favorites.data, false, false);
  }, [friends.data, favorites.data]);

  return (
    <GenericScreen>
      <View style={styles.container} >
        {friends.isLoading && (<LoadingIndicator absolute />)}
        <FlatList
          data={instances}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardViewInstance instance={item} style={styles.cardView} onPress={() => routeToInstance(item.worldId, item.instanceId)} />
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", marginTop: spacing.large }}>
              <Text style={{ color: theme.colors.text }}>No friends online in instances.</Text>
            </View>
          )}
          numColumns={2}
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