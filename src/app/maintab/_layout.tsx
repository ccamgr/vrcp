import { HapticTab } from "@/components/layout/HapticTab";
import MenuButtonForHeader from "@/components/layout/MenuButtonForHeader";
import IconButton from "@/components/view/icon-components/IconButton";
import SearchBox from "@/components/view/SearchBox";
import { spacing } from "@/configs/styles";
import { routeToSearch } from "@/libs/route";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { push } from "expo-router/build/global-state/routing";
import React from "react";
import { Image, Platform, useColorScheme, View } from "react-native";
import { Colors } from "react-native/Libraries/NewAppScreen";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
        headerRight: MenuButtonForHeader,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerTitle: (props) => (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: spacing.small,
              }}
            >
              <Image
                source={require("@/assets/images/logo.png")}
                style={{ height: "80%", aspectRatio: 1, resizeMode: "cover" }}
              />
            </View>
          ),
          headerRight: () => (
            <View style={{ flex: 1, paddingRight: spacing.medium }}>
              <SearchBox
                onSubmit={routeToSearch}
                placeholder="Search worlds, avatars, and users..."
              />
            </View>
          ),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="people" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="favorite" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: "Resources",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={28}
              name="nature-people"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="account-circle" color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="settings" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
