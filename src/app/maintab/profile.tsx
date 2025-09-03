import { CurrentUser } from "@/api/vrchat";
import LinkChip from "@/components/chip-badge/LinkChip";
import DetailItemContainer from "@/components/detailpage-components/DetailItemContainer";
import GenericScreen from "@/components/GenericScreen";
import CardViewUserDetail from "@/components/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/LoadingIndicator";
import { radius, spacing } from "@/config/styles";
import useVRChat from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { useTheme } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";


export default function Profile() {
  const vrc = useVRChat();
  const theme = useTheme();  
  const [currentUser, setCurrentUser] = useState<CurrentUser>();

  const fetchProfile = async () => {
    try {
      const res = await vrc.authenticationApi.getCurrentUser(); 
      if (res.data) setCurrentUser(res.data);
    } catch (error) {
      console.error("Error fetching user profile:", extractErrMsg(error));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);


  return (
    <GenericScreen>
      { currentUser ? (
        <View>
          <CardViewUserDetail
            user={currentUser}
            style={[styles.cardView]} 
          />
          
          <ScrollView>

            <DetailItemContainer title="Bio">
              <View style={styles.detailItemContent}>
                <Text style={{color: theme.colors.text}}>{currentUser.bio}</Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Links">
              <View style={styles.detailItemContent}>
                {currentUser.bioLinks.map((link, index) => (
                  <LinkChip key={index} url={link} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Joined date">
              <View style={styles.detailItemContent}>
                <Text style={{color: theme.colors.text}}>{currentUser.date_joined}</Text>
              </View>
            </DetailItemContainer>

            <View style={{padding: spacing.large, marginTop: spacing.large }}>
              <Text style={{color: theme.colors.text}}>{JSON.stringify(currentUser, null, 2)}</Text>
            </View>
          </ScrollView>
        
        </View>
      ) : (
        <LoadingIndicator />
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