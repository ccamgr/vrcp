import { GroupLike } from "@/lib/vrchat";
import { StyleSheet } from "react-native";
import BaseCardView from "./BaseCardView";
import React from "react";

interface Props {
  group: GroupLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: GroupLike) => data.bannerUrl ?? "";
const extractTitle = (data: GroupLike) => data.name ?? "";

const CardViewGroup = ({ group, onPress, onLongPress, ...rest }: Props) => {
  return (
    <BaseCardView
      data={group}
      imageUrl={extractImageUrl}
      title={extractTitle}
      onPress={onPress}
      onLongPress={onLongPress}
      ImageStyle={styles.image}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    aspectRatio: 16 / 7,
  },
});
export default React.memo(CardViewGroup);
