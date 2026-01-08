import { GroupLike } from "@/lib/vrchat";
import { StyleSheet } from "react-native";
import BaseCardView from "../BaseCardView";

interface Props {
  group: GroupLike;
  onPress?: () => void;
  onLongPress?: () => void;
  [key: string]: any;
}

const extractImageUrl = (data: GroupLike) => data.bannerUrl ?? "";
const extractTitle = (data: GroupLike) => data.name ?? "";

const CardViewGroupDetail = ({
  group,
  onPress,
  onLongPress,
  ...rest
}: Props) => {
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
    aspectRatio: 3 / 1,
  },
});
export default CardViewGroupDetail;
