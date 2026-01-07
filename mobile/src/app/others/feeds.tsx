import GenericScreen from "@/components/layout/GenericScreen";
import ListViewPipelineMessage from "@/components/view/item-ListView/ListViewPipelineMessage";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { PipelineMessage } from "@/generated/pipline/type";
import { useTheme } from "@react-navigation/native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { StyleSheet, Text } from "react-native";
import { FlatList } from "react-native-gesture-handler";


export default function Feeds() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { pipelineMessages } = useData();

  const renderItem = useCallback(({item} : { item: PipelineMessage}) => (
    <ListViewPipelineMessage message={item} style={styles.feed} />
  ), []);
  const emptyComponent = useCallback(() => (
    <View style={styles.empty}>
      <Text style={{ color: theme.colors.text }}>{t("pages.feeds.no_feeds")}</Text>
    </View>
  ), []);

  return (
    <GenericScreen>
      <View style={styles.container} >
        <FlatList
          data={pipelineMessages}
          keyExtractor={(item) => `${item.timestamp}-${item.type}`}
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
  feed: {
    width: "100%",
  },
  cardView: {
    width: "50%",
  },
  empty: {
    alignItems: "center",
    marginTop: spacing.large
  }
});