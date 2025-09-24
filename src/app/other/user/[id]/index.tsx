import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/components/screen/detail/DetailItemContainer";
import LinkChip from "@/components/view/chip-badge/LinkChip";
import CardViewUserDetail from "@/components/view/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, radius, spacing } from "@/config/styles";
import { CachedImage, useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/lib/extractErrMsg";
import { getInstanceType, parseLocationString } from "@/lib/vrchatUtils";
import { User } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vrc = useVRChat();
  const cache = useCache();
  const theme = useTheme();
  const [user, setUser] = useState<User>();
  const [locationInfo, setLocationInfo] = useState<{
    image: string | undefined;
    baseInfo: string | undefined;
    instType: string | undefined;
    capacity: string | undefined;
  }>();

  const fetchData = async () => {
    try {
      const res = await cache.user.get(id, true); // fetch and force refresh cache
      setUser(res);
    } catch (error) {
      console.error("Error fetching user profile:", extractErrMsg(error));
    }
  };

  const fetchLocationInfo = async () => {
    if (!user?.location) return;
    const { isOffline, isPrivate, parsedLocation } = parseLocationString(
      user?.location
    );
    if (isOffline) {
      setLocationInfo({
        image: undefined,
        baseInfo: "the user is offline...",
        instType: undefined,
        capacity: undefined,
      });
    } else if (isPrivate) {
      setLocationInfo({
        image: undefined,
        baseInfo: "the user is in a private instance...",
        instType: undefined,
        capacity: undefined,
      });
    } else if (parsedLocation?.worldId && parsedLocation?.instanceId) {
      try {
        const res = await vrc.instancesApi.getInstance({
          worldId: parsedLocation.worldId,
          instanceId: parsedLocation.instanceId,
        });
        if (res.data) {
          setLocationInfo({
            image: res.data.world?.thumbnailImageUrl,
            baseInfo: `${res.data.world?.name}`,
            instType: `${getInstanceType(res.data.type)} #${res.data.name}`,
            capacity: `${res.data.n_users}/${res.data.capacity}`,
          });
        }
      } catch (error) {
        console.error("Error fetching current location:", extractErrMsg(error));
      }
    } else {
      setLocationInfo({
        image: undefined,
        baseInfo: "the user is in an unknown location...",
        instType: undefined,
        capacity: undefined,
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLocationInfo();
  }, [user?.location]);

  const handleEditNote = () => {};

  return (
    <GenericScreen>
      {user ? (
        <View style={{ flex: 1 }}>
          <CardViewUserDetail user={user} style={[styles.cardView]} />
          <ScrollView>
            <DetailItemContainer title="Location">
              {!locationInfo && <LoadingIndicator size={30} />}
              {locationInfo?.image && (
                <CachedImage
                  style={styles.detailItemImage}
                  src={locationInfo?.image ?? ""}
                />
              )}
              <View style={styles.detailItemContent}>
                {locationInfo?.baseInfo && (
                  <Text numberOfLines={1} style={{ color: theme.colors.text }}>
                    {locationInfo?.baseInfo}
                  </Text>
                )}
                {locationInfo?.instType && (
                  <Text numberOfLines={1} style={{ color: theme.colors.text }}>
                    {locationInfo?.instType}
                  </Text>
                )}
                {locationInfo?.capacity && (
                  <Text numberOfLines={1} style={{ color: theme.colors.text }}>
                    {locationInfo?.capacity}
                  </Text>
                )}
              </View>
            </DetailItemContainer>

            <DetailItemContainer
              title="Note"
              iconButtonConfig={{ name: "edit", onPress: handleEditNote }}
            >
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>{user.note}</Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Bio">
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>{user.bio}</Text>
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Links">
              <View style={styles.detailItemContent}>
                {user.bioLinks.map((link, index) => (
                  <LinkChip key={index} url={link} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Joined date">
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {user.date_joined}
                </Text>
              </View>
            </DetailItemContainer>

            <Text style={{ color: "gray" }}>
              {JSON.stringify(user, null, 2)}
            </Text>
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
  detailItemImage: {
    marginRight: spacing.small,
    height: spacing.small * 2 + fontSize.medium * 3,
    aspectRatio: 16 / 9,
  },
});
