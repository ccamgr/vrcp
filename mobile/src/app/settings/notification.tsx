import GenericScreen from "@/components/layout/GenericScreen";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";



export default function NotificationsSettings() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <GenericScreen>
      <View></View>
      {/* <Text style={{ color: theme.colors.text }}>notifications</Text> */}
    </GenericScreen>
  );
}
