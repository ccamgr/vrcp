import GenericScreen from "@/components/layout/GenericScreen";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { routeToAvatar, routeToWorld } from "@/libs/route";
import { Avatar, LimitedWorld, Print } from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useData } from "@/contexts/DataContext";
import CardViewPrint from "@/components/view/item-CardView/CardViewPrint";
import { CachedImage } from "@/contexts/CacheContext";
// user's avatar, world, and other uploaded resources
export default function Resources() {
  const vrc = useVRChat();
  const { currentUser } = useData();
  const theme = useTheme();
  const NumPerReq = 50;

  const MaterialTab = createMaterialTopTabNavigator();

  const AvatarsTab = () => {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const offset = useRef(0);

    const fetchAvatars = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await vrc.avatarsApi.searchAvatars({
          offset: offset.current,
          n: NumPerReq,
          user: "me",
          releaseStatus: "all",
        });
        setAvatars(res.data);
        offset.current += NumPerReq;
      } catch (e) {
        console.error("Error fetching own avatars:", extractErrMsg(e));
      } finally {
        fetchingRef.current = false;
      }
    };

    useEffect(() => {
      fetchAvatars();
    }, []);

    return (
      <View style={styles.tabpanel}>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={avatars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardViewAvatar
              avatar={item}
              style={styles.cardView}
              onPress={() => routeToAvatar(item.id)}
            />
          )}
          numColumns={2}
        />
      </View>
    );
  };
  const WorldsTab = () => {
    const [worlds, setWorlds] = useState<LimitedWorld[]>([]);
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const offset = useRef(0);

    const fetchWorlds = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await vrc.worldsApi.searchWorlds({
          offset: offset.current,
          n: NumPerReq,
          user: "me",
          releaseStatus: "all",
        });
        setWorlds(res.data);
        offset.current += NumPerReq;
      } catch (e) {
        console.error("Error fetching own worlds:", extractErrMsg(e));
      } finally {
        fetchingRef.current = false;
      }
    };

    useEffect(() => {
      fetchWorlds();
    }, []);

    return (
      <View style={styles.tabpanel}>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={worlds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardViewWorld
              world={item}
              style={styles.cardView}
              onPress={() => routeToWorld(item.id)}
            />
          )}
          numColumns={2}
        />
      </View>
    );
  };
  const PrintsTab = () => {
    const [prints, setPrints] = useState<Print[]>([]);
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    // prints, ...etc
    const fetchPrints = async () => {
      try {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        const res = await vrc.printsApi.getUserPrints({
          userId: currentUser.data?.id || ""
        });
        setPrints(res.data);
      } catch (e) {
        console.error("Error fetching own prints:", extractErrMsg(e));
      } finally {
        fetchingRef.current = false;
      }
    };
    useEffect(() => {
      fetchPrints();
    }, []);

    return (
      <View style={styles.tabpanel}>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          data={prints}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            // <CardViewPrint print={item} style={styles.printView} />
            <CachedImage src={item.files.image || ""} style={{ width: "100%", aspectRatio: 1.4, margin: spacing.small }} resizeMode="cover"/>
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", marginTop: spacing.large }}>
              <Text style={{ color: theme.colors.text }}>
                No prints available.
              </Text>
            </View>
          )}
          numColumns={1}
        />
      </View>
    );
  };

  return (
    <GenericScreen>
      <MaterialTab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: theme.colors.background },
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
        }}
      >
        <MaterialTab.Screen
          name="avatar"
          options={{ tabBarLabel: "Avatars" }}
          component={useCallback(AvatarsTab, [])}
        />
        <MaterialTab.Screen
          name="world"
          options={{ tabBarLabel: "Worlds" }}
          component={useCallback(WorldsTab, [])}
        />
        <MaterialTab.Screen
          name="print"
          options={{ tabBarLabel: "Prints" }}
          component={useCallback(PrintsTab, [])}
        />
      </MaterialTab.Navigator>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  tabpanel: {
    flex: 1,
  },
  cardView: {
    padding: spacing.small,
    width: "50%",
  },
  printView: {
    padding: spacing.small,
    width: "100%",
  },
});
