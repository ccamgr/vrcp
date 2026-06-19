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
      {/* details */}
      <Stack.Screen
        name="user/[id]/index"
        options={{ title: t("pages.detail_user.label") }}
      />
      <Stack.Screen
        name="world/[id]/index"
        options={{ title: t("pages.detail_world.label") }}
      />
      <Stack.Screen
        name="instance/[id]/index"
        options={{ title: t("pages.detail_instance.label") }}
      />
      <Stack.Screen
        name="avatar/[id]/index"
        options={{ title: t("pages.detail_avatar.label") }}
      />
      <Stack.Screen
        name="group/[id]/index"
        options={{ title: t("pages.detail_group.label") }}
      />
      <Stack.Screen
        name="event/[id]/index"
        options={{ title: t("pages.detail_event.label") }}
      />
      {/* user subroutes */}
      <Stack.Screen
        name="user/[id]/worlds"
        options={{ title: t("pages.detail_user_worlds.label") }}
      />
      <Stack.Screen
        name="user/[id]/groups"
        options={{ title: t("pages.detail_user_groups.label") }}
      />
    </Stack>
  );
}
