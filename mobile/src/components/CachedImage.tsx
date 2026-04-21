import { getUserAgent, omitObject } from "@/lib/utils";
import { Image as ExpoImage } from "expo-image";

const CachedImage = ({
  src: remoteUri,
  localUriRef,
  ...rest
}: {
  src: string;
  localUriRef?: React.RefObject<string | null>; // to get current local-uri
  [key: string]: any;
}) => {

  return (
    <ExpoImage
      source={{
        uri: remoteUri,
        headers: { 'User-Agent': getUserAgent() },
      }}
      style={[{ contentFit: "cover" }, rest.style]}
      {...omitObject(rest, "style")}
    />
  );
};

export default CachedImage;
