import { HapticTab } from "@/components/layout/HapticTab";
import MenuButtonForHeader from "@/components/layout/MenuButtonForHeader";
import IconButton from "@/components/view/icon-components/IconButton";
import SearchBox from "@/components/view/SearchBox";
import { spacing } from "@/configs/styles";
import { routeToSearch } from "@/lib/route";
import { getTintedColor } from "@/lib/utils";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Platform, useColorScheme, View } from "react-native";

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
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
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("pages.home.label"),
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
                  clearOnSubmit={true}
                  placeholder={t("pages.search.searchbox_placeholder")}
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
          title: t("pages.friends.label"),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="people" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("pages.profile.label"),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="account-circle" color={color} />
          ),
          headerRight: MenuButtonForHeader,
        }}
      />
      <Tabs.Screen
        name="others"
        options={{
          title: t("pages.others.label"),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="menu" color={color} />
          ),
          headerRight: MenuButtonForHeader,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("pages.settings.label"),
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="settings" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
