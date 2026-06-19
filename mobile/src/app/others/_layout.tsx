import BackButtonForHeader from "@/components/layout/BackButtonForHeader";
import { Stack } from "expo-router";
import MenuButtonForHeader from "@/components/layout/MenuButtonForHeader";
import { useTranslation } from "react-i18next";

export default function ModalLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        // headerShown: false,
        headerLeft: BackButtonForHeader,
        headerRight: MenuButtonForHeader,
      }}
    >
      {/* Profile > menus */}
      <Stack.Screen
        name="favorites"
        options={{ title: t("pages.favorites.label"), headerRight: undefined }}
      />
      <Stack.Screen
        name="avatars"
        options={{ title: t("pages.avatars.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="worlds"
        options={{ title: t("pages.worlds.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="groups"
        options={{ title: t("pages.groups.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="prints"
        options={{ title: t("pages.prints.label"), headerRight: undefined }} // no menu button
      />

      {/* Other > tabs */}
      <Stack.Screen
        name="analytics"
        options={{ title: t("pages.analytics.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="calendar"
        options={{ title: t("pages.calendar.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="feeds"
        options={{ title: t("pages.feeds.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t("pages.notifications.label"),
          headerRight: undefined,
        }} // no menu button
      />

      {/* Home */}
      <Stack.Screen
        name="friendlocations"
        options={{
          title: t("pages.friendlocations.label"),
          headerRight: undefined,
        }} // no menu button
      />
      <Stack.Screen
        name="search"
        options={{ title: t("pages.search.label"), headerRight: undefined }} // no menu button
      />
    </Stack>
  );
}
