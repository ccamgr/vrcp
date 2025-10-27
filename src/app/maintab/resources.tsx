import GenericScreen from "@/components/layout/GenericScreen";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { routeToAvatar, routeToWorld } from "@/libs/route";
import { Avatar, LimitedWorld, OrderOption, Print, SortOption } from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, StyleSheet, Text, Touchable, TouchableOpacity, View } from "react-native";
import { useData } from "@/contexts/DataContext";
import CardViewPrint from "@/components/view/item-CardView/CardViewPrint";
import { CachedImage } from "@/contexts/CacheContext";
import ImagePreview from "@/components/view/ImagePreview";
import { useSetting } from "@/contexts/SettingContext";
// user's avatar, world, and other uploaded resources
export default function Resources() {
  const vrc = useVRChat();
  const { currentUser } = useData();
  const { settings } = useSetting();
  const cardViewColumns = settings.uiOptions.layouts.cardViewColumns;
  const theme = useTheme();
  const NumPerReq = 50;

  const MaterialTab = createMaterialTopTabNavigator();

  const AvatarsTab = () => {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const fetchingRef = useRef(false);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);
    const offset = useRef(0);

    const fetchAvatars = async () => {
      if (fetchingRef.current || offset.current < 0) return;
      fetchingRef.current = true;
      try {
        const res = await vrc.avatarsApi.searchAvatars({
          offset: offset.current,
          n: NumPerReq,
          user: "me",
          releaseStatus: "all",
          sort: SortOption.Updated,
          order: OrderOption.Descending,
        });
        if (res.data.length === 0) {
          offset.current = -1; // reset offset if no more data
        } else {
          setAvatars(prev => [...prev, ...res.data]);
          offset.current += NumPerReq;
        }
      } catch (e) {
        console.error("Error fetching own avatars:", extractErrMsg(e));
      } finally {
        fetchingRef.current = false;
      }
    };

    useEffect(() => {
      fetchAvatars();
    }, []);

    const reload = () => {
      offset.current = 0;
      setAvatars([]);
      fetchAvatars();
    };

    return (
      <View style={styles.tabpanel}>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          // key={`avatar-list-col-${cardViewColumns}`} // to re-render on column change
          data={avatars}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardViewAvatar
              avatar={item}
              style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
              onPress={() => routeToAvatar(item.id)}
            />
          )}
          numColumns={cardViewColumns}
          onEndReached={fetchAvatars}
          onEndReachedThreshold={0.5}
          onRefresh={reload}
          refreshing={isLoading}
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
      if (fetchingRef.current || offset.current < 0) return;
      fetchingRef.current = true;
      try {
        const res = await vrc.worldsApi.searchWorlds({
          offset: offset.current,
          n: NumPerReq,
          user: "me",
          releaseStatus: "all",
          sort: SortOption.Updated,
          order: OrderOption.Descending,
        });
        if (res.data.length === 0) {
          offset.current = -1; // reset offset if no more data
        } else {
          setWorlds(prev => [...prev, ...res.data]);
          offset.current += NumPerReq;
        }
      } catch (e) {
        console.error("Error fetching own worlds:", extractErrMsg(e));
      } finally {
        fetchingRef.current = false;
      }
    };

    useEffect(() => {
      fetchWorlds();
    }, []);

    const reload = () => {
      offset.current = 0;
      setWorlds([]);
      fetchWorlds();
    }

    return (
      <View style={styles.tabpanel}>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          // key={`world-list-col-${cardViewColumns}`} // to re-render on column change
          data={worlds}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardViewWorld
              world={item}
              style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]}
              onPress={() => routeToWorld(item.id)}
            />
          )}
          numColumns={cardViewColumns}
          onEndReached={fetchWorlds}
          onEndReachedThreshold={0.5}
          onRefresh={reload}
          refreshing={isLoading}
        />
      </View>
    );
  };
  const PrintsTab = () => {
    const [prints, setPrints] = useState<Print[]>([]);
    const fetchingRef = useRef(false);
    const offset = useRef(0);
    const isLoading = useMemo(() => fetchingRef.current, [fetchingRef.current]);

    const [preview, setPreview] = useState<{ idx: number; open: boolean }>({ idx: 0, open: false });
    const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
    // prints, ...etc
    const fetchPrints = async () => {
      try {
        if (fetchingRef.current || offset.current < 0) return;
        fetchingRef.current = true;
        const res = await vrc.printsApi.getUserPrints({
          userId: currentUser.data?.id || "",
        }, {
          // API仕様にはないがoffsetとnを指定できるっぽい
          params: {
            offset: offset.current,
            n: NumPerReq,
            sort: SortOption.Updated,
            order: OrderOption.Descending,
          }
        });
        if (res.data.length === 0) {
          offset.current = -1; // reset offset if no more data
        } else {
          setPrints(prev => [...prev, ...res.data]);
          setPreviewImageUrls(prev => [...prev, ...res.data.map(print => print.files.image || "").filter(url => url.length > 0)]);
          offset.current += NumPerReq;
        }
      } catch (e) {
        console.error("Error fetching own prints:", extractErrMsg(e));
      } finally {
        fetchingRef.current = false;
      }
    };
    useEffect(() => {
      fetchPrints();
    }, []);
    const reload = () => {
      offset.current = 0;
      setPrints([]);
      setPreviewImageUrls([]);
      fetchPrints();
    };

    return (
      <View style={styles.tabpanel}>
        {isLoading && <LoadingIndicator absolute />}
        <FlatList
          // key={`print-list-col-${cardViewColumns}`} // to re-render on column change
          data={prints}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <CardViewPrint print={item} style={[styles.cardView, { width: `${100 / cardViewColumns}%` }]} onPress={() => setPreview({ idx: index, open: true })} />
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", marginTop: spacing.large }}>
              <Text style={{ color: theme.colors.text }}>
                No prints available.
              </Text>
            </View>
          )}
          numColumns={cardViewColumns}
          onEndReached={fetchPrints}
          onEndReachedThreshold={0.5}
          onRefresh={reload}
          refreshing={isLoading}
        />
        
        {/* dialog and modals */}
        <ImagePreview imageUrls={previewImageUrls} initialIdx={preview.idx} open={preview.open} onClose={() => setPreview(prev => ({ ...prev, open: false }))} />
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
});
