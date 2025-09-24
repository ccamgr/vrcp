import GenericScreen from "@/components/layout/GenericScreen";
import CardViewAvatar from "@/components/view/item-CardView/CardViewAvatar";
import CardViewWorld from "@/components/view/item-CardView/CardViewWorld";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { spacing } from "@/config/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { routeToAvatar, routeToWorld } from "@/lib/route";
import { Avatar, LimitedWorld } from "@/vrchat/api";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
// user's avatar, world, and other uploaded resources
export default function Resources() {
  const vrc = useVRChat();
  const theme = useTheme();
  const NumPerReq = 50;

  const MaterialTab = createMaterialTopTabNavigator();

  const AvatarsTab = () => {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);

    const fetchAvatars = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchAvatars();
    }, []);

    return (
      <View>
        {isLoading && <LoadingIndicator absolute />}
        <Text style={{ color: theme.colors.text }}>Avatars</Text>
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
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const offset = useRef(0);

    const fetchWorlds = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchWorlds();
    }, []);

    return (
      <View>
        {isLoading && <LoadingIndicator absolute />}
        <Text style={{ color: theme.colors.text }}>Worlds</Text>
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
  const OtherTab = () => {
    // prints, ...etc
    return (
      <View>
        <Text style={{ color: theme.colors.text }}>Other</Text>
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
          component={AvatarsTab}
        />
        <MaterialTab.Screen
          name="world"
          options={{ tabBarLabel: "Worlds" }}
          component={WorldsTab}
        />
        <MaterialTab.Screen
          name="other"
          options={{ tabBarLabel: "Other" }}
          component={OtherTab}
        />
      </MaterialTab.Navigator>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cardView: {
    padding: spacing.small,
    width: "50%",
  },
});
