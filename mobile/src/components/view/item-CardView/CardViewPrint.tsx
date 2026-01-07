import { fontSize, spacing } from "@/configs/styles";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import BaseCardView from "./BaseCardView";
import { Print } from "@/generated/vrcapi";
import { formatToDateStr } from "@/lib/date";

interface Props {
  print: Print;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: Print) => data.files.image || "";
const extractTitle = (data: Print) => {
  if (!data.timestamp && !data.authorName && !data.worldName) return "Unknown Print";
  const titles = []
  if (data.timestamp.length > 0) titles.push(formatToDateStr(data.timestamp));
  // if (data.authorName.length > 0) titles.push(`by ${data.authorName}`);
  if (data.worldName.length > 0) titles.push(`in ${data.worldName}`);
  return titles.join(" ");
};

const CardViewPrint = ({ print: world, onPress, onLongPress, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <BaseCardView
      data={world}
      onPress={onPress}
      onLongPress={onLongPress}
      imageUrl={extractImageUrl}
      title={extractTitle}
      ImageStyle={styles.image}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    // 白い部分をトリミング
    transform: [{ translateY: "10%" }, { scale: 1.35 }],
    resizeMode: "contain",
  }
});
export default React.memo(CardViewPrint);
