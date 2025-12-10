import GenericModal from "@/components/layout/GenericModal";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { spacing } from "@/configs/styles";
import { useCache } from "@/contexts/CacheContext";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DatabaseModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const cache = useCache();
  // const db = useDB();

  const [cacheInfo, setCacheInfo] = useState<{
    size: number;
    count: number;
  }>();
  const [databaseInfo, setDatabaseInfo] = useState<{
    size: number;
    rows: number;
  }>();

  const refleshCacheInfo = async () => {
    const info = await cache.getCacheInfo();
    setCacheInfo(info);
  };
  const clearCache = async () => {
    setCacheInfo(undefined);
    await cache.clearCache();
    refleshCacheInfo();
  }

  // const refleshDatabaseInfo = async () => {
  //   const info = await db.getDBInfo();
  //   setDatabaseInfo(info);
  // }

  // const resetDB = async () => {
  //   setDatabaseInfo(undefined);
  //   await db.resetDB();
  //   refleshDatabaseInfo();
  // }
  
  useEffect(() => {
    if (open) {
      // setDatabaseInfo(undefined);
      // refleshDatabaseInfo();
      
      setCacheInfo(undefined);
      refleshCacheInfo();
    }
  }, [open]);

  return (
    <GenericModal
      title={t("components.databaseModal.title")}
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
    >
      {/* <Text style={[globalStyles.subheader, { color: theme.colors.text }]}>
        Database Backup
      </Text>
      <View style={globalStyles.container}>
        <View>
          {databaseInfo ? (
            <View style={styles.cacheContainer}>
              <Text
                style={[
                  globalStyles.text,
                  globalStyles.container,
                  { color: theme.colors.text },
                ]}
              >
                {`${(databaseInfo.size / (1024 * 1024)).toFixed(2)} MB, ${
                  databaseInfo.rows
                } Rows`}
              </Text>
              <Button
                style={[globalStyles.button, { marginLeft: spacing.medium }]}
                color={theme.colors.text}
                onPress={resetDB}
              >
                Reset
              </Button>
            </View>
          ) : (
            <LoadingIndicator size={32} notext />
          )}
        </View>
      </View> */}
      <Text style={[globalStyles.subheader, { color: theme.colors.text }]}>
        {t("components.databaseModal.groupLabel_storage")}
      </Text>
      <View style={globalStyles.container}>
        <View>
          {cacheInfo ? (
            <View style={styles.cacheContainer}>
              <Text
                style={[
                  globalStyles.text,
                  globalStyles.container,
                  { color: theme.colors.text },
                ]}
              >   
                {t("components.databaseModal.cache_size_and_count", {size: (cacheInfo.size / (1024 * 1024)).toFixed(2), count: cacheInfo.count})}
              </Text>
              <Button
                style={[globalStyles.button, { marginLeft: spacing.medium }]}
                color={theme.colors.text}
                onPress={clearCache}
              >
                {t("components.databaseModal.button_clearCache")}
              </Button>
            </View>
          ) : (
            <LoadingIndicator size={32} notext />
          )}
        </View>
      </View>
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
