import ReleaseStatusChip from "@/components/view/chip-badge/ReleaseStatusChip";
import { fontSize, spacing } from "@/configs/styles";
import { WorldLike } from "@/lib/vrchat";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import BaseCardView from "../BaseCardView";
import { routeToUser } from "@/lib/route";
import { Link } from "expo-router";

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
      FooterStyle={{marginRight: mgn + spacing.medium}}
      OverlapComponents={
        <>
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
  chipContainer: {
    position: "absolute",
    margin: spacing.medium,
    bottom: 0,
    right: 0,
  },
  title: {
    fontSize: fontSize.large,
  },
});
export default CardViewWorldDetail;
