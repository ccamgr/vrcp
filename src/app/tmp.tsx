import GenericScreen from "@/components/layout/GenericScreen";
import { useTheme } from "@react-navigation/native";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";



export default function Tmp() {
  const theme = useTheme();

  return (
    <GenericScreen>
      <Text style={{ color: theme.colors.text }}>Tmp</Text>
    </GenericScreen>
  );
}
