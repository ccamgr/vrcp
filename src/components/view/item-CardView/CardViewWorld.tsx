import { fontSize, spacing } from "@/config/styles";
import { getWorldPlatform, WorldLike } from "@/lib/vrchatUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import PlatformChips from "../chip-badge/PlatformChips";
import IconSymbol from "../icon-components/IconView";
import BaseCardView from "./BaseCardView";

interface Props {
  world: WorldLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: WorldLike) => data.thumbnailImageUrl;
const extractTitle = (data: WorldLike) => data.name ?? "";

const CardViewWorld = ({ world, onPress, onLongPress, ...rest }: Props) => {
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
      FooterStyle={{ marginRight: mgn }}
      OverlapComponents={
        <>
          <View style={styles.occupantsContainer} onLayout={onLayout}>
            <Text style={[styles.occupants, { color: theme.colors.subText }]}>
              {world.occupants}
            </Text>
            <IconSymbol
              name="people"
              size={fontSize.small * 1.1}
              color={theme.colors.subText}
            />
          </View>
          <View style={styles.platformContainer}>
            <PlatformChips size={24} platforms={getWorldPlatform(world)} />
          </View>
        </>
      }
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  occupantsContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.small,
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  occupants: {
    display: "flex",
    fontSize: fontSize.small,
    textAlignVertical: "top",
  },
  platformContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    opacity: 0.8, // transparent
    // borderColor: "red", borderStyle: "solid", borderWidth: 1,
  },
});
export default CardViewWorld;
