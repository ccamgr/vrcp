import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/screen/detail/DetailItemContainer";
import LinkChip from "@/components/view/chip-badge/LinkChip";
import CardViewUserDetail from "@/components/view/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { radius, spacing } from "@/config/styles";
import { useData } from "@/contexts/DataContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { useTheme } from "@react-navigation/native";
import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Profile() {
  const vrc = useVRChat();
  const theme = useTheme();
  const { currentUser } = useData();

  return (
    <GenericScreen>
      {currentUser.data ? (
        <View>
          <CardViewUserDetail
            user={currentUser.data}
            style={[styles.cardView]}
          />

          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={currentUser.isLoading}
                onRefresh={currentUser.fetch}
              />
            }
          >
            <DetailItemContainer title="Bio">
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {currentUser.data.bio}
                </Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Links">
              <View style={styles.detailItemContent}>
                {currentUser.data.bioLinks.map((link, index) => (
                  <LinkChip key={index} url={link} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Joined date">
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {currentUser.data.date_joined}
                </Text>
              </View>
            </DetailItemContainer>

            <View style={{ padding: spacing.large, marginTop: spacing.large }}>
              <Text style={{ color: theme.colors.subText }}>
                {JSON.stringify(currentUser.data, null, 2)}
              </Text>
            </View>
          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cardView: {
    position: "relative",
    paddingVertical: spacing.medium,
    pointerEvents: "none", // override TouchableOpacity events
  },
  badgeContainer: {
    position: "absolute",
    width: "100%",
    top: spacing.medium,
    bottom: spacing.medium,
    borderRadius: radius.small,
    padding: spacing.medium,
  },
  badge: {
    padding: spacing.small,
    width: "20%",
    aspectRatio: 1,
  },

  detailItemContent: {
    flex: 1,
    // borderStyle:"dotted", borderColor:"red",borderWidth:1
  },
});
