import { fontSize, spacing } from "@/configs/styles";
import { omitObject } from "@/lib/utils";
import { Badge, InstanceRegion, Region } from "@/generated/vrcapi";
import { opacity } from "react-native-reanimated/lib/typescript/Colors";
import CachedImage from "@/components/CachedImage";

interface Props {
  badge: Badge;
  [key: string]: any;
}
const BadgeChip = ({ badge, ...rest }: Props) => {
  return (
    <CachedImage
      src={badge.badgeImageUrl}
      style={[{ margin: spacing.mini, aspectRatio: 1, height: 32, opacity: badge.hidden ? 0.5 : 1 }, rest.style]}
      {...omitObject(rest, "style")}
    />
  );
};

export default BadgeChip;
