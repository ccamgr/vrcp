import GenericScreen from "@/components/layout/GenericScreen";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { MenuItem } from "@/components/layout/type";
import Feeds from "../others/feeds";
import EventCalendar from "../others/calendar";
import Notifications from "../others/notifications";
import Analytics from "../others/analytics";

export default function Others() {
  const theme = useTheme();
  const { t } = useTranslation();
  const MaterialTab = createMaterialTopTabNavigator();

  return (
    <GenericScreen>
      <MaterialTab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: theme.colors.background },
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
        }}
      >
        <MaterialTab.Screen
          name="notifications"
          options={{ tabBarLabel: t("pages.others.tabLabel_notifications") }}
          component={Notifications} //
        />
        <MaterialTab.Screen
          name="events"
          options={{ tabBarLabel: t("pages.others.tabLabel_events") }}
          component={EventCalendar} //
        />
        <MaterialTab.Screen
          name="feeds"
          options={{ tabBarLabel: t("pages.others.tabLabel_feeds") }}
          component={Feeds} //
        />
        <MaterialTab.Screen
          name="analytics"
          options={{ tabBarLabel: t("pages.others.tabLabel_analytics") }}
          component={Analytics} //
        />
      </MaterialTab.Navigator>
    </GenericScreen>
  );
};


