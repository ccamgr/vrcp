import { ButtonEx, TouchableEx } from "@/components/CustomElements";
import QRScanner from "@/components/features/QRScanner";
import GenericScreen from "@/components/layout/GenericScreen";
import ListViewPipelineMessage from "@/components/view/item-ListView/ListViewPipelineMessage";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { PipelineMessage } from "@/generated/vrcpipline/type";
import { useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { StyleSheet, Text } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import * as BackgroundTask from 'expo-background-task';
import { useSetting } from "@/contexts/SettingContext";
import { getLogsFromDesktop } from "@/generated/desktopapi/client";
import { analyzeSessions, WorldSession } from "@/lib/funcs/analizeSessions";


export default function Analytics() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings } = useSetting();
  const [sessions, setSessions] = useState<WorldSession[]>([]);

  const fetchLogs = useCallback(async () => {
    // テスト用にAPIから全取得しているが，本来は日付指定でDBから取得
    if (!settings.otherOptions_desktopAppURL) {
      console.warn("Desktop app URL is not set.");
      return;
    }
    try {
      const res = await getLogsFromDesktop(settings.otherOptions_desktopAppURL, {
        start: undefined,
        end: undefined,
      });
      if (res.status !== 200) {
        console.error("Failed to fetch logs from desktop app:", res.statusText);
        return;
      } else {
        const analyzedSessions = analyzeSessions(res.data);
        setSessions(analyzedSessions);
      }
      console.log("Fetched logs from desktop app:", res.data);
    } catch (error) {
      console.error("Failed to fetch logs from desktop app:", error);
    }

  }, [settings.otherOptions_desktopAppURL]);

  useEffect(() => {
    fetchLogs();
  }, []);


  return (
    <GenericScreen>
      <View style={styles.container} >
        {/* この部分にセッションを表示するコンポーネントを追加 */}
      </View>
    </GenericScreen>
  );


};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatlistInner: {
    paddingTop: spacing.medium,
  },
  feed: {
    width: "100%",
  },
  cardView: {
    width: "50%",
  },
  empty: {
    alignItems: "center",
    marginTop: spacing.large
  }
});
