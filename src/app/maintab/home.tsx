import GenericScreen from "@/components/layout/GenericScreen";
import globalStyles from "@/config/styles";
import { useData } from "@/contexts/DataContext";
import { Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { navigate } from "expo-router/build/global-state/routing";
import { StyleSheet, Text } from "react-native";

export default function Home() {
  const theme = useTheme();
  const {currentUser} = useData();

  return (
    <GenericScreen>
      <Text style={[globalStyles.text, {color: theme.colors.subText, fontSize: 20}]}>
        Favorite friends and their Locations,
      </Text>
      <Button onPress={() => {navigate("/_sitemap")}} >SiteMap</Button>

      <Text style={[globalStyles.text, {color: theme.colors.text}]}>
        {`
[ToDo]  
  - webhook for Feed,
  - globally state controll
    - how to handle data pagenation?
    - how to handle data update?
  - push notification for Feed update
        `}
      </Text>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  
})

