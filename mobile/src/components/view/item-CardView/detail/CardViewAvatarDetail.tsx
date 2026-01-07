import ReleaseStatusChip from "@/components/view/chip-badge/ReleaseStatusChip";
import { fontSize, spacing } from "@/configs/styles";
import { Avatar } from "@/generated/api";
import { Text } from "@react-navigation/elements";
import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import BaseCardView from "../BaseCardView";
import { routeToUser } from "@/libs/route";

interface Props {
  avatar: Avatar;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: Avatar) => data.imageUrl;
const extractTitle = (data: Avatar) => data.name;

const CardViewAvatarDetail = ({
  avatar,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
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
      TitleStyle={styles.title}
      FooterStyle={{marginRight: mgn + spacing.medium}}
      OverlapComponents={
        <>
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

export default CardViewAvatarDetail;
