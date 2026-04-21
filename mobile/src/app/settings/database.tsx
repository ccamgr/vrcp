import { ButtonEx } from "@/components/CustomElements";
import GenericScreen from "@/components/layout/GenericScreen";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { spacing } from "@/configs/styles";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";



export default function DatabaseSettings() {
  const theme = useTheme();
  const { t } = useTranslation();
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
    // setCacheInfo(info);
  };
  const clearCache = async () => {
    setCacheInfo(undefined);
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
    // setDatabaseInfo(undefined);
    // refleshDatabaseInfo();

    setCacheInfo(undefined);
    refleshCacheInfo();
  }, []);

  return (
    <GenericScreen>
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
        {t("pages.setting_database.groupLabel_cache")}
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
                {t("pages.setting_database.cache_size_and_count", { size: (cacheInfo.size / (1024 * 1024)).toFixed(2), count: cacheInfo.count })}
              </Text>
              <ButtonEx
                style={[globalStyles.button, { marginLeft: spacing.medium }]}
                color={theme.colors.text}
                onPress={clearCache}
              >
                {t("pages.setting_database.button_clearCache")}
              </ButtonEx>
            </View>
          ) : (
            <LoadingIndicator size={32} notext />
          )}
        </View>
      </View>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  cacheContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
