import GenericScreen from "@/components/layout/GenericScreen";
import DetailItemContainer from "@/features/detail/DetailItemContainer";
import LinkChip from "@/components/view/chip-badge/LinkChip";
import CardViewUserDetail from "@/components/view/item-CardView/detail/CardViewUserDetail";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import { fontSize, radius, spacing } from "@/configs/styles";
import { CachedImage, useCache } from "@/contexts/CacheContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { extractErrMsg } from "@/libs/utils";
import { getInstanceType, parseLocationString } from "@/libs/vrchat";
import { User } from "@/vrchat/api";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, TouchableOpacity } from "react-native";
import { KeyboardAvoidingView, KeyboardAvoidingViewComponent, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { routeToInstance } from "@/libs/route";
import BadgeChip from "@/components/view/chip-badge/BadgeChip";

export default function UserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vrc = useVRChat();
  const cache = useCache();
  const theme = useTheme();
  const [user, setUser] = useState<User>();
  const [locationInfo, setLocationInfo] = useState<{
    wId?: string;
    iId?: string;
    image?: string | undefined;
    baseInfo: string | undefined;
    instType?: string | undefined;
    capacity?: string | undefined;
  }>();

  const [editNote, setEditNote] = useState(false);
  const editting = React.useRef<string>("");

  const fetchLocationInfo = async () => {
    if (!user?.location) return;
    const { isOffline, isPrivate, isTraveling, parsedLocation } = parseLocationString(
      user?.location
    );
    if (isOffline) {
      setLocationInfo({
        baseInfo: "the user is offline...",
      });
    } else if (isPrivate) {
      setLocationInfo({
        baseInfo: "the user is in a private instance...",
      });
    } else if (isTraveling) {
      setLocationInfo({
        baseInfo: "the user is traveling...",
      });
    } else if (parsedLocation?.worldId && parsedLocation?.instanceId) {
      try {
        const res = await vrc.instancesApi.getInstance({
          worldId: parsedLocation.worldId,
          instanceId: parsedLocation.instanceId,
        });
        if (res.data) {
          setLocationInfo({
            wId: res.data.worldId,
            iId: res.data.instanceId,
            image: res.data.world?.thumbnailImageUrl,
            baseInfo: `${res.data.world?.name}`,
            instType: `${getInstanceType(res.data.type)} #${res.data.name}${res.data.displayName ? ` (${res.data.displayName})` : ""}`,
            capacity: `${res.data.n_users}/${res.data.capacity}`,
          });
        }
      } catch (error) {
        console.error("Error fetching current location:", extractErrMsg(error));
      }
    } else {
      setLocationInfo({
        baseInfo: "the user is in an unknown location...",
      });
    }
  };

  useEffect(() => {
    cache.user.get(id, true) // force latest data
    .then(setUser)
    .catch(console.error);
  }, []);

  useEffect(() => {
    fetchLocationInfo();
  }, [user?.location]);

  const handleEditNote = () => {
    editting.current = user?.note ?? "";
    setEditNote(p => !p);
  };
  const handleSubmitNote = () => {
    vrc.usersApi.updateUserNote({ updateUserNoteRequest: {
      targetUserId: id,
      note: editting.current,
    }}).then(res => {
      res.status === 200 && setUser(u => u ? { ...u, note: editting.current } : u);
    }).catch(err => {
      console.error("Error updating user note:", extractErrMsg(err));
    });
    setEditNote(false);
  }

  return (
    <KeyboardAvoidingView behavior={ Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <GenericScreen>
      {user ? (
        <View style={{ flex: 1 }}>
          <CardViewUserDetail user={user} style={[styles.cardView]} />
          <ScrollView>

            <DetailItemContainer title="Location">
              {locationInfo ? (
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.location}
                  onPress={(locationInfo.wId && locationInfo.iId) ? () => routeToInstance(locationInfo.wId!, locationInfo.iId!) : undefined}
                >
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
                </TouchableOpacity>
              ) : (
                <LoadingIndicator size={30} />
              )}
              
            </DetailItemContainer>

            <DetailItemContainer
              title="Note"
              iconButtonConfig={
                editNote ? [
                  { name: "close", onPress: handleEditNote },
                  // { name: "save", onPress: () => handleSubmitNote(editting.current) },
                ] : [
                  { name: "edit", onPress: handleEditNote }
                ]}
            >
              <View style={styles.detailItemContent}>
                {editNote ?
                    <TextInput
                      style={{ color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: radius.small, padding: spacing.small }}
                      defaultValue={user.note}
                      onChange={e => editting.current = e.nativeEvent.text}
                      autoFocus
                      placeholder="Add a note"
                      multiline
                      numberOfLines={4}
                      onBlur={handleSubmitNote} // submit on blur
                    />
                  : <Text style={{ color: theme.colors.text }}>{user.note}</Text>
                }
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

            <DetailItemContainer title="Badges">
              <View style={[styles.detailItemContent, styles.horizontal]}>
                {user.badges?.map((badge) => (
                  <BadgeChip key={badge.badgeId} badge={badge} />
                ))}
              </View>
            </DetailItemContainer>

            <DetailItemContainer title="Info">
              <View style={styles.detailItemContent}>
                <Text style={{ color: theme.colors.text }}>
                  {`last activity: ${user.last_activity}`}
                </Text>
                <Text style={{ color: theme.colors.text }}>
                  {`first joined: ${user.date_joined}`}
                </Text>
              </View>
            </DetailItemContainer>

            <Text style={{ color: "gray" }}>
              {JSON.stringify(user, null, 2)}
            </Text>
          </ScrollView>
        </View>
      ) : (
        <LoadingIndicator absolute />
      )}
    </GenericScreen>
    </KeyboardAvoidingView>
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
  location: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
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
  horizontal: { 
    flexDirection: "row", 
    alignItems: "center",
    flexWrap: "wrap",
  },
});
