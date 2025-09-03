import { Avatar } from "@/api/vrchat";
import ReleaseStatusChip from "@/components/chip-badge/ReleaseStatusChip";
import { fontSize, spacing } from "@/config/styles";
import { Text } from "@react-navigation/elements";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import BaseCardView from "../BaseCardView";

interface Props {
  avatar: Avatar;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: Avatar) => data.thumbnailImageUrl;
const extractTitle = (data: Avatar) => data.name;

const CardViewAvatarDetail = ({ avatar, onPress, onLongPress, ...rest }: Props) => {
  const [mgn, setMgn] = useState<number>(0);
  const onLayout = (event: LayoutChangeEvent) => {
    setMgn(event.nativeEvent.layout.width);
  };
  return (
    <BaseCardView
      data={avatar}
      onPress={onPress}
      onLongPress={onLongPress}
      imageUrl={extractImageUrl}
      title={extractTitle}
      OverlapComponents={
        <>
          <View style={[styles.authorContainer, {marginRight: mgn}]}>
            <Text numberOfLines={1}>by  <Text style={styles.author}>{avatar.authorName}</Text></Text>
          </View>
          <View style={styles.chipContainer} onLayout={onLayout}>
            <ReleaseStatusChip data={avatar} />
          </View>
        </>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  authorContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    margin: spacing.small,
    paddingLeft: spacing.small,
    paddingRight: spacing.large,
    position: "absolute",
    bottom: 0,
    left: 0,

    // borderColor: "red", borderStyle: "solid", borderWidth: 1,

  },
  author: {
    fontSize: fontSize.medium,
    textDecorationLine: "underline",
  },
  chipContainer: {
    position: "absolute",    
    margin: spacing.small,
    bottom: 0,
    right: 0,
  },
  footer: {
    paddingBottom: fontSize.medium + spacing.small * 2,
  },
});

export default CardViewAvatarDetail;