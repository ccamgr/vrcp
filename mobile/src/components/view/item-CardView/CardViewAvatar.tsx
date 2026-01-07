import { spacing } from "@/configs/styles";
import { Avatar } from "@/generated/vrcapi";
import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import ReleaseStatusChip from "../chip-badge/ReleaseStatusChip";
import BaseCardView from "./BaseCardView";

interface Props {
  avatar: Avatar;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: Avatar) => data.thumbnailImageUrl;
const extractTitle = (data: Avatar) => data.name;

const CardViewAvatar = ({ avatar, onPress, onLongPress, ...rest }: Props) => {
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
      FooterStyle={{ marginRight: mgn }}
      OverlapComponents={
        <View style={styles.chipContainer} onLayout={onLayout}>
          <ReleaseStatusChip data={avatar} />
        </View>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  chipContainer: {
    position: "absolute",
    padding: spacing.small,
    bottom: 0,
    right: 0,
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
});

export default React.memo(CardViewAvatar);
