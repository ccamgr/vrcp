import { fontSize, spacing } from "@/configs/styles";
import { CachedImage } from "@/contexts/CacheContext";
import { omitObject } from "@/libs/utils";
import { Badge, InstanceRegion, Region } from "@/generated/api";
import { opacity } from "react-native-reanimated/lib/typescript/Colors";

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
