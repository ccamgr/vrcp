import { ButtonEx } from "@/components/CustomElements";
import QRScanner from "@/components/features/QRScanner";
import GenericScreen from "@/components/layout/GenericScreen";
import ListViewPipelineMessage from "@/components/view/item-ListView/ListViewPipelineMessage";
import { spacing } from "@/configs/styles";
import { useData } from "@/contexts/DataContext";
import { PipelineMessage } from "@/vrchat/pipline/type";
import { useTheme } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { StyleSheet, Text } from "react-native";
import { FlatList } from "react-native-gesture-handler";


export default function Analytics() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [QROpen, setQROpen] = useState(false);

  return (
    <GenericScreen>
      <View style={styles.container} >
        <ButtonEx
          onPress={() => setQROpen(true)}
        >
          QR Scanner
        </ButtonEx>
      </View>
      <QRScanner
        open={QROpen}
        setOpen={setQROpen}
        onScan={(v) => console.log(v)}
      />
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
