import GenericScreen from "@/components/layout/GenericScreen";
import { MenuItem } from "@/components/layout/type";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { Notification } from "@/generated/vrcapi";
import { extractNotificationContent } from "@/lib/funcs/extractNotificationContent";
import { useTheme } from "@react-navigation/native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { StyleSheet, Text } from "react-native";
import { FlatList } from "react-native-gesture-handler";


export default function Notifications() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { notifications } = useData();

  const renderItem = useCallback(({item} : { item: Notification}) => {
    const { title, contents } = extractNotificationContent(item)
    return (
      <View style={styles.notifications}>
        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "bold" }}>{title}</Text>
        {contents.map((content, i) => (
          <Text style={{ color: theme.colors.text, marginTop: spacing.small }} key={i}>{content}</Text>
        ))}
      </View>
    )
  }, []);
  const emptyComponent = useCallback(() => (
    <View style={styles.empty}>
      <Text style={{ color: theme.colors.text }}>{t("pages.notifications.no_notifications")}</Text>
    </View>
  ), []);



  return (
    <GenericScreen >
      <View style={styles.container} >
        <FlatList
          data={notifications.data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={emptyComponent}
          numColumns={1}
          contentContainerStyle={styles.flatlistInner}
        />
      </View>
    </GenericScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatlistInner: {
    paddingTop: spacing.medium,
  },
  notifications: {
    width: "100%",
  },
  empty: {
    alignItems: "center",
    marginTop: spacing.large
  }
});
