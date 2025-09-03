import { InstanceRegion, Region } from "@/api/vrchat";
import { CachedImage } from "@/contexts/ImageCacheContext";
import { omitObject } from "@/lib/objectUtils";

const REGION_IMAGE_URL = "https://assets.vrchat.com/www/images/";

interface Props {
  region: InstanceRegion | Region;
  [key: string]: any;
}
const RegionBadge = ({ region, ...rest }: Props) => {
  if (region == "unknown") return null;
  const regionImageName = `Region_${region.toUpperCase().slice(0, 2)}.png`;
  return (
    <CachedImage
      src={REGION_IMAGE_URL + regionImageName}
      style={[{ aspectRatio: 1 }, rest.style]}
      {...omitObject(rest, "style")}
    />
  );
}


export default RegionBadge;