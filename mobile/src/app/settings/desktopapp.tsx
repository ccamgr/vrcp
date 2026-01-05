import { TouchableEx } from "@/components/CustomElements";
import QRScanner from "@/components/features/QRScanner";
import GenericScreen from "@/components/layout/GenericScreen";
import IconSymbol from "@/components/view/icon-components/IconView";
import { useSetting } from "@/contexts/SettingContext";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

const DEFAULT_PORT = 8727;

export default function DesktopAppSettings() {
  const { colors } = useTheme();
  const { settings, saveSettings } = useSetting();

  // 設定から読み込んだ値を管理
  const desktopAppURL = settings.otherOptions.desktopAppURL;

  // テキスト入力用のローカルステート (入力中は保存せず、確定時に保存するため)
  const [inputValue, setInputValue] = useState(desktopAppURL || "");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 設定値が変わったら（QRスキャン後など）、テキストボックスの表示も更新
  useEffect(() => {
    setInputValue(desktopAppURL || "");
  }, [desktopAppURL]);

  const setDesktopAppURL = (url: string) => {
    if (!url) return;
    // format: "http(s)://host:port"
    let formattedUrl = url;
    if (!formattedUrl.match(/^https?:\/\//)) {
      formattedUrl = "http://" + formattedUrl;
    }
    if (!formattedUrl.match(/:\d+$/)) {
      formattedUrl = formattedUrl.replace(/\/?$/, `:${DEFAULT_PORT}`);
    }

    saveSettings({
      otherOptions: {
        ...settings.otherOptions,
        desktopAppURL: formattedUrl,
      }
    });
    // 入力エリアも整形後の値に更新
    setInputValue(formattedUrl);
  };

  // テキスト入力完了時（Enterキーやフォーカス外れ）
  const handleManualSubmit = () => {
    setDesktopAppURL(inputValue);
  };


  return (
    <GenericScreen>
      <View style={styles.container}>

        {/* 説明テキスト */}
        <View style={styles.headerContainer}>
          <Text style={[styles.description, { color: colors.text }]}>
            デスクトップアプリと連携するためのURLを設定します。
            PC画面のQRコードを読み取るか、直接入力してください。
          </Text>
        </View>

        {/* 1. QRコードで読み込むボタン */}
        <TouchableEx
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setIsScannerOpen(true)}
        >
          <IconSymbol name="qrcode-scan" size={24} color={colors.text} />
          <Text style={styles.scanButtonText}>QRコードをスキャン</Text>
        </TouchableEx>

        <View style={styles.divider}>
          <Text style={[styles.dividerText, { color: colors.border }]}>- OR -</Text>
        </View>

        {/* 2. テキストで直打ちするエリア */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            <IconSymbol name="keyboard" size={16} color={colors.text} style={{ marginRight: 4 }} />
            Server URL
          </Text>

          <View style={[styles.textInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="link" size={18} color={colors.text} style={{ opacity: 0.5, marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={inputValue}
              onChangeText={setInputValue}
              onEndEditing={handleManualSubmit} // 入力終了時に保存・整形
              placeholder={`http://192.168.x.x:${DEFAULT_PORT}`}
              placeholderTextColor={colors.border}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
            />
          </View>
          <Text style={[styles.helperText, { color: colors.notification }]}>
            ※ 入力完了後に自動で整形・保存されます
          </Text>
        </View>

        {/* QRスキャンモーダル */}
        <QRScanner
          open={isScannerOpen}
          setOpen={setIsScannerOpen}
          onScan={setDesktopAppURL}
        />

      </View>
    </GenericScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  headerContainer: {
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  helperText: {
    fontSize: 11,
    opacity: 0.6,
    textAlign: 'right',
  }
});
