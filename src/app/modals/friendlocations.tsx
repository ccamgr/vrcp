import GenericScreen from "@/components/layout/GenericScreen";
import UserChip from "@/components/view/chip-badge/UserChip";
import CardViewInstance from "@/components/view/item-CardView/CardViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { navigationBarHeight, spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { usersTable } from "@/db/schema";
import SeeMoreContainer from "@/features/home/SeeMoreContainer";
import { calcFriendsLocations } from "@/libs/funcs/calcFriendLocations";
import { routeToInstance, routeToUser } from "@/libs/route";
import { InstanceLike } from "@/libs/vrchat";
import { LimitedUserFriend } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { FlatList, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";



export default function FriendLocations() {
  const theme = useTheme();
  const { friends, favorites } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const refresh = () => {
    setIsLoading(true);
    friends
      .fetch()
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const {instances, unlocatableFriends} = useMemo(() => {
    return calcFriendsLocations(friends.data, favorites.data, false, true);
  }, [friends.data, favorites.data]);

  

  return (
    <GenericScreen>
      <View style={styles.container} >
        {friends.isLoading && (<LoadingIndicator absolute />)}
        <SectionList
          sections={[
            { 
              title: `Friends in Instances `, 
              data: chunkArray(instances, 2), // 2 columns
              keyExtractor: (_, index) => `friend-instance-chunk-${index}`,
              renderItem: ({ item }) => (
                <View style={styles.chunk}>
                {item.map((instance: InstanceLike) => (
                  <CardViewInstance key={instance.id} instance={instance} style={styles.cardView} onPress={() => routeToInstance(instance.worldId, instance.instanceId)} />
                ))}
                </View>
              )
            },
            { 
              title: `Private Friends`, 
              data: chunkArray(unlocatableFriends, 3), // 3 columns
              keyExtractor: (_, index) => `private-friend-chunk-${index}`,
              renderItem: ({ item }) => (
                <View style={styles.chunk}>
                  {item.map((friend: LimitedUserFriend) => (
                    <TouchableOpacity style={styles.userChip} onPress={() => routeToUser(friend.id)} activeOpacity={0.7}>
                      <UserChip key={friend.id} user={friend} />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            },
          ] as { 
            title: string; 
            data: any[]; 
            keyExtractor: (item: any, index: number) => string;
            renderItem: ({ item }: { item: any }) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null 
          }[]}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, {borderBottomColor: theme.colors.border}]}>
              <Text style={{fontWeight: "bold", color: theme.colors.text}}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listInner}
          refreshing={isLoading}
          onRefresh={refresh}
        />
      </View>
    </GenericScreen>
  );
}


const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingTop: spacing.medium, 
    marginBottom: spacing.small, 
    borderBottomWidth: 1, 
  },
  chunk: {
    flexDirection: "row",
    marginBottom: spacing.small,
  },
  cardView: {
    width: "50%",
  },
  userChip: {
    width: "33%",
  },
  listInner: {
    paddingBottom: navigationBarHeight + spacing.medium,
  },
});