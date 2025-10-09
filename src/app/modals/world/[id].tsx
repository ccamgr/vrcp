import GenericScreen, { MenuItem } from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/features/detail/DetailItemContainer";
import PlatformChips from "@/components/view/chip-badge/PlatformChips";
import TagChips from "@/components/view/chip-badge/TagChips";
import CardViewWorldDetail from "@/components/view/item-CardView/detail/CardViewWorldDetail";
import ListViewInstance from "@/components/view/item-ListView/ListViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { fontSize, navigationBarHeight, radius, spacing } from "@/configs/styles";
import { useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { formatToDateTime } from "@/libs/date";
import { extractErrMsg } from "@/libs/utils";
import {
  getAuthorTags,
  getPlatform,
  getTrustRankColor,
  InstanceLike,
  parseInstanceId,
} from "@/libs/vrchat";
import { User, World } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native";
import UserChip from "@/components/view/chip-badge/UserChip";
import { routeToSearch, routeToUser } from "@/libs/route";
import { useData } from "@/contexts/DataContext";

export default function WorldDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vrc = useVRChat();
  const cache = useCache();
  const data = useData();
  const theme = useTheme();
  const [world, setWorld] = useState<World>();
  const [author, setAuthor] = useState<User>();
  const [mode, setMode] = useState<"info" | "instance">("info");
  
  const isFavorite = data.favorites.data.some(fav => fav.favoriteId === id && fav.type === "world");

  const fetchData = async () => {
    try {
      const res = await cache.world.get(id, true); // fetch and force refresh cache
      setWorld(res);
    } catch (error) {
      console.error("Error fetching world profile:", extractErrMsg(error));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  

  useEffect(() => {
    if (!world?.authorId) return;
    cache.user.get(world.authorId).then((u) => setAuthor(u)).catch(console.error)
  }, [world?.authorId])

  const formatAndSortInstances = (
    instances: any[][] | undefined
  ): InstanceLike[] => {
    const parsedInstances = [] as InstanceLike[];
    instances?.forEach((item) => {
      const [id, n_users] = item;
      if (typeof id !== "string" || typeof n_users !== "number") return;
      const parsed = parseInstanceId(id);
      if (!parsed) return;
      const instance = {
        id: id,
        instanceId: id,
        worldId: world?.id ?? "",
        name: parsed?.name,
        type: parsed.type,
        groupAccessType: parsed?.groupAccessType,
        n_users: n_users,
        capacity: world?.capacity ?? 0,
        region: parsed?.region ?? "unknown",
      };
      parsedInstances.push(instance);
    });
    const sortedInstances = parsedInstances.sort(
      (a, b) => b.n_users - a.n_users
    );
    return sortedInstances;
  };

  const handleAddFavorite = (name:string) => {
    vrc.favoritesApi.addFavorite({addFavoriteRequest: {
      favoriteId: id,
      type: "world",
      tags: name ? [name] : [], // ex. worlds1
    }}).then(res => {
      if (res.status !== 200) return;
      data.favorites.set((prev) => [...prev, res.data]); // update cache
    }).catch(err => {
      console.error("Error adding favorite:", extractErrMsg(err));
    });
  };
  const handleRemoveFavorite = () => {
    vrc.favoritesApi.removeFavorite({
      favoriteId: id,
    }).then(res => {
      if (res.status !== 200) return;
      data.favorites.set((prev) => prev.filter(fav => fav.favoriteId !== id)); // update cache
    }).catch(err => {
      console.error("Error removing favorite:", extractErrMsg(err));
    });
  };


  const menuItems: MenuItem[] = [
    {
      icon: isFavorite ? "heart-minus" : "heart-plus",
      title: isFavorite ? "Remove Favorite" : "Add Favorite",
      onPress: isFavorite ? () => console.log("remove favorite modal") : () => console.log("add favorite modal"),
    },
  ];

  return (
    <GenericScreen menuItems={menuItems}>
      {world ? (
        <View style={{ flex: 1 }}>
          <CardViewWorldDetail world={world} style={[styles.cardView]} />

          <SelectGroupButton
            data={["info", "instance"]}
            value={mode}
            onChange={setMode}
          />

          {mode === "info" && (
            <ScrollView>
              <DetailItemContainer title="Platform">
                <View style={styles.detailItemContent}>
                  <PlatformChips platforms={getPlatform(world)} />
                </View>
              </DetailItemContainer>

              <DetailItemContainer title="Description">
                <View style={styles.detailItemContent}>
                  <Text style={{ color: theme.colors.text }}>
                    {world.description}
                  </Text>
                </View>
              </DetailItemContainer>

              <DetailItemContainer title="Tags">
                <View style={styles.detailItemContent}>
                  <TagChips tags={getAuthorTags(world)} onPress={(tag) => routeToSearch(tag)} />
                </View>
              </DetailItemContainer>

              <DetailItemContainer title="Author">
                {author && (
                  <View style={styles.detailItemContent}>
                    <TouchableOpacity onPress={() => routeToUser(author.id)} activeOpacity={0.7}>
                      <UserChip user={author} textColor={getTrustRankColor(author, true, false)}/>
                    </TouchableOpacity>
                  </View>
                )}
              </DetailItemContainer>

              <DetailItemContainer title="Info">
                <View style={styles.detailItemContent}>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{`capacity: ${world.capacity}`}</Text>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{`visits: ${world.visits}`}</Text>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{`created: ${formatToDateTime(world.created_at)}`}</Text>
                  <Text
                    style={{ color: theme.colors.text }}
                  >{`updated: ${formatToDateTime(world.updated_at)}`}</Text>
                </View>
              </DetailItemContainer>

              <Text style={{ color: "gray" }}>
                {JSON.stringify(world, null, 2)}
              </Text>
            </ScrollView>
          )}

          {mode === "instance" && (
            <FlatList
              data={formatAndSortInstances(world.instances)}
              renderItem={({ item }) => <ListViewInstance instance={item} />}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", marginTop: spacing.large }}>
                  <Text style={{ color: theme.colors.text }}>
                    No instances available.
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.listInner}
            />
          )}
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cardView: {
    position: "relative",
    paddingVertical: spacing.medium,
    pointerEvents: "none", // override TouchableOpacity events
  },
  badgeContainer: {
    position: "absolute",
    width: "100%",
    top: spacing.medium,
    bottom: spacing.medium,
    borderRadius: radius.small,
    padding: spacing.medium,
  },
  badge: {
    padding: spacing.small,
    width: "20%",
    aspectRatio: 1,
  },
  listInner: {
    paddingTop: spacing.small,
    paddingBottom: navigationBarHeight + spacing.medium,
  },

  detailItemContent: {
    flex: 1,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
  detailItemImage: {
    marginRight: spacing.small,
    height: spacing.small * 2 + fontSize.medium * 3,
    aspectRatio: 16 / 9,
  },
});
