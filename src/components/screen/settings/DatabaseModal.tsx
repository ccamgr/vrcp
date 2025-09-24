import GenericModal from "@/components/layout/GenericModal";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { spacing } from "@/config/styles";
import { useCache } from "@/contexts/CacheContext";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DatabaseModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const imageCache = useCache();

  const [imageCacheInfo, setImageCacheInfo] = useState<{
    size: number;
    count: number;
  }>();

  const refleshImageCacheInfo = async () => {
    setImageCacheInfo(undefined);
    const info = await imageCache.getCacheInfo();
    setImageCacheInfo(info);
  };

  useEffect(() => {
    if (open) refleshImageCacheInfo();
  }, [imageCache, open]);

  return (
    <GenericModal open={open} onClose={() => setOpen(false)}>
      <Text
        style={[
          globalStyles.header,
          globalStyles.headerContainer,
          { color: theme.colors.text },
        ]}
      >
        Database Management
      </Text>
      <Text style={[globalStyles.subheader, { color: theme.colors.text }]}>
        Database Backup
      </Text>
      <View style={globalStyles.container}></View>
      <Text style={[globalStyles.subheader, { color: theme.colors.text }]}>
        Cache Clear
      </Text>
      <View style={globalStyles.container}>
        {/* <Text style={[globalStyles.text, {color: theme.colors.text}]}>Clear the app cache to free up space.</Text>
          <Text style={[globalStyles.text, {color: theme.colors.text}]}>This will not delete your data.</Text> */}
        <View>
          {imageCacheInfo ? (
            <View style={styles.cacheContainer}>
              <Text
                style={[
                  globalStyles.text,
                  globalStyles.container,
                  { color: theme.colors.text },
                ]}
              >
                {`${(imageCacheInfo.size / (1024 * 1024)).toFixed(2)} MB, ${
                  imageCacheInfo.count
                } Files`}
              </Text>
              <Button
                style={[globalStyles.button, { marginLeft: spacing.medium }]}
                color={theme.colors.text}
                onPress={async () => {
                  await imageCache.clearCache();
                  refleshImageCacheInfo();
                }}
              >
                Clear
              </Button>
            </View>
          ) : (
            <LoadingIndicator size={32} notext />
          )}
        </View>
      </View>
      <Button
        style={[
          globalStyles.button,
          { marginTop: spacing.medium, width: "100%" },
        ]}
        color={theme.colors.text}
        onPress={() => setOpen(false)}
      >
        close
      </Button>
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  cacheContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

export default DatabaseModal;
