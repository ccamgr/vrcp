import ReleaseStatusChip from "@/components/view/chip-badge/ReleaseStatusChip";
import { fontSize, spacing } from "@/config/styles";
import { WorldLike } from "@/lib/vrchatUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import BaseCardView from "../BaseCardView";

interface Props {
  world: WorldLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: WorldLike) => data.imageUrl;
const extractTitle = (data: WorldLike) => data.name ?? "";

const CardViewWorldDetail = ({
  world,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
  const theme = useTheme();
  const [mgn, setMgn] = useState<number>(0);
  const onLayout = (event: LayoutChangeEvent) => {
    setMgn(event.nativeEvent.layout.width);
  };
  return (
    <BaseCardView
      data={world}
      onPress={onPress}
      onLongPress={onLongPress}
      imageUrl={extractImageUrl}
      title={extractTitle}
      TitleStyle={styles.title}
      FooterStyle={styles.footer}
      OverlapComponents={
        <>
          <View style={[styles.authorContainer, { marginRight: mgn }]}>
            <Text numberOfLines={1}>
              by <Text style={styles.author}>{world.authorName}</Text>
            </Text>
          </View>
          <View style={styles.chipContainer} onLayout={onLayout}>
            <ReleaseStatusChip data={world} />
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
  title: {
    fontSize: fontSize.large,
  },
});
export default CardViewWorldDetail;
