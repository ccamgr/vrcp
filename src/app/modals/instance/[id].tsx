import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/screen/detail/DetailItemContainer";
import PlatformChips from "@/components/view/chip-badge/PlatformChips";
import TagChips from "@/components/view/chip-badge/TagChips";
import UserChip from "@/components/view/chip-badge/UserChip";
import CardViewInstanceDetail from "@/components/view/item-CardView/detail/CardViewInstanceDetail";
import CardViewWorldDetail from "@/components/view/item-CardView/detail/CardViewWorldDetail";
import ListViewInstance from "@/components/view/item-ListView/ListViewInstance";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { fontSize, radius, spacing } from "@/config/styles";
import { useCache } from "@/contexts/CacheContext";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { formatToDateTime } from "@/lib/date";
import { extractErrMsg } from "@/lib/extractErrMsg";
import {
  getAuthorTags,
  getTrustRankColor,
  getWorldPlatform,
  InstanceLike,
  parseInstanceId,
  parseLocationString,
  UserLike,
} from "@/lib/vrchatUtils";
import { Instance, World } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";

export default function InstanceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); // must be locationStr (e.g. wrld_xxx:00000~region(jp)) 
  const { parsedLocation } = parseLocationString(id);
  const vrc = useVRChat();
  const { friends: allFriends } = useData();
  const cache = useCache();
  const theme = useTheme();
  const [instance, setInstance] = useState<Instance>();

  const fetchData = async () => {
    // instance isnot cached 
    try {
      const res = await vrc.instancesApi.getInstance({
        worldId: parsedLocation?.worldId ?? "",
        instanceId: parsedLocation?.instanceId ?? "",
      });
      setInstance(res.data);
    } catch (error) {
      console.error("Error fetching world profile:", extractErrMsg(error));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [owner, setOwner] = useState<UserLike>();
  useEffect(() => {
    if (!instance || !instance.ownerId) return;
    cache.user.get(instance.ownerId)
      .then(setOwner)
      .catch(console.error);
  }, [instance, instance?.ownerId]);

  const friends = useMemo(() => {
    if (!instance) return [];
    if (instance?.users) {
      return instance.users.filter((u) => u.isFriend);
    }
    const location = `${instance.worldId}:${instance.instanceId}`;
    return allFriends.data.filter((f) => f.location === location);
  }, [instance, instance?.users]);

  const ownerAndFriends = useMemo(() => {
    const list = [];
    if (owner) list.push(owner);
    list.forEach(f => {
      if (f.id !== owner?.id) list.push(f);
    });
    return list;
  }, [owner, friends]);

  return (
    <GenericScreen>
      {instance ? (
        <View style={{ flex: 1 }}>
          <CardViewInstanceDetail instance={instance} style={[styles.cardView]} />

          <ScrollView>
            <DetailItemContainer title="Users">
              <View style={styles.detailItemContent}>
                {ownerAndFriends.map((friend) => (
                  <UserChip key={friend.id} user={friend} textColor={getTrustRankColor(friend, true, false)} optional={friend.id === owner?.id}/>
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Platform">
              <View style={styles.detailItemContent}>
                <PlatformChips platforms={getWorldPlatform(instance.world)} />
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Tags">
              <View style={styles.detailItemContent}>
                <TagChips tags={getAuthorTags(instance.world)} />
              </View>
            </DetailItemContainer>


            <DetailItemContainer title="Info">
              <View style={styles.detailItemContent}>
                <Text
                  style={{ color: theme.colors.text }}
                >{`capacity: ${instance.capacity}`}</Text>
                <Text
                  style={{ color: theme.colors.text }}
                >{`agegated: ${instance.ageGate}`}</Text>
              </View>
            </DetailItemContainer>

            <Text style={{ color: "gray" }}>
              {JSON.stringify(instance, null, 2)}
            </Text>
          </ScrollView>

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
