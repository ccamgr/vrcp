import { World } from "@/api/vrchat";
import GenericScreen from "@/components/GenericScreen";
import LoadingIndicator from "@/components/LoadingIndicator";
import SelectGroupButton from "@/components/SelectGroupButton";
import PlatformChips from "@/components/chip-badge/PlatformChips";
import TagChips from "@/components/chip-badge/TagChips";
import DetailItemContainer from "@/components/detailpage-components/DetailItemContainer";
import CardViewWorldDetail from "@/components/item-CardView/detail/CardViewWorldDetail";
import ListViewInstance, { MinInstance } from "@/components/item-ListView/ListViewInstance";
import { fontSize, radius, spacing } from "@/config/styles";
import useVRChat from "@/contexts/VRChatContext";
import { formatToDateTime } from "@/lib/date";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { getAuthorTags, getWorldPlatform, parseInstanceId } from "@/lib/vrchatUtils";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";


export default function WorldDetail() {
  const { id } = useLocalSearchParams<{id: string}>();
  const vrc = useVRChat();
  const theme = useTheme();  
  const [world, setWorld] = useState<World>();
  const [mode, setMode] = useState<"info" | "instance">("info");

  const fetchData = async () => {
    try {
      const res = await vrc.worldsApi.getWorld(id);
      if (res.data) setWorld(res.data);
    } catch (error) {
      console.error("Error fetching world profile:", extractErrMsg(error));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const formatAndSortInstances = (instances : any[][] | undefined) : MinInstance[] => {
    const parsedInstances = [] as MinInstance[] 
    instances?.forEach(item => {
      const [id, n_users] = item;
      if (typeof id !== "string" || typeof n_users !== "number") return;
      const parsed = parseInstanceId(id);
      if (!parsed) return;
      const instance = {
        id: id,
        name: parsed?.name,
        type: parsed.type,
        groupAccessType: parsed?.groupAccessType,
        n_users: n_users,
        capacity: world?.capacity ?? 0,
        region: parsed?.region ?? "unknown",
      };
      parsedInstances.push(instance);
    });
    const sortedInstances = parsedInstances.sort((a, b) => b.n_users - a.n_users);
    return sortedInstances;
  }
  

  return (
    <GenericScreen>
      { world ? (
        <View style={{ flex: 1 }}>
          <CardViewWorldDetail
            world={world}
            style={[styles.cardView]} 
          />

          <SelectGroupButton
            data={["info", "instance"]}
            value={mode}
            onChange={setMode}
          />

          {mode === "info" && (
            <ScrollView>
              <DetailItemContainer title="Platform">
                <View style={styles.detailItemContent}>
                  <PlatformChips platforms={getWorldPlatform(world)} />
                </View>
              </DetailItemContainer>

              <DetailItemContainer title="Tags">
                <View style={styles.detailItemContent}>
                  <TagChips tags={getAuthorTags(world)} />
                </View>
              </DetailItemContainer>

              <DetailItemContainer title="Description">
                <View style={styles.detailItemContent}>
                  <Text style={{color: theme.colors.text}}>{world.description}</Text>
                </View>
              </DetailItemContainer>

              <DetailItemContainer title="Info">
                <View style={styles.detailItemContent}>
                  <Text style={{color: theme.colors.text}}>{`capacity: ${world.capacity}`}</Text>
                  <Text style={{color: theme.colors.text}}>{`visits: ${world.visits}`}</Text>
                  <Text style={{color: theme.colors.text}}>{`created: ${formatToDateTime(world.created_at)}`}</Text>
                  <Text style={{color: theme.colors.text}}>{`updated: ${formatToDateTime(world.updated_at)}`}</Text>
                </View>
              </DetailItemContainer>

              <Text style={{color:"gray"}}>{JSON.stringify(world, null, 2)}</Text>

            </ScrollView>
          )}

          {mode === "instance" && (
            <FlatList
              data={formatAndSortInstances(world.instances)}
              renderItem={({ item }) => (
                <ListViewInstance instance={item} />
              )}
              keyExtractor={(item) => item.id}
            />
          )}  
        </View>
      ) : (
        <LoadingIndicator />
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