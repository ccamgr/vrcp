import { TouchableEx } from "@/components/CustomElements";
import QRScanner from "@/components/features/QRScanner";
import GenericScreen from "@/components/layout/GenericScreen";
import IconSymbol from "@/components/view/icon-components/IconView";
import { useSetting } from "@/contexts/SettingContext";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useLogManager } from "@/hooks/useLogManager";
import { useToast } from "@/contexts/ToastContext";

const DEFAULT_PORT = 8727;

export default function DesktopAppSettings() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { settings, saveSettings } = useSetting();

  // ログ管理フックを呼び出し
  const { isSyncing, syncProgress, syncLogs } = useLogManager();

  // 設定から読み込んだ値を管理
  const desktopAppURL = settings.otherOptions_desktopAppURL;

  // テキスト入力用のローカルステート
  const [inputValue, setInputValue] = useState(desktopAppURL || "");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    setInputValue(desktopAppURL || "");
  }, [desktopAppURL]);

  const setDesktopAppURL = (url: string) => {
    if (!url) return;
    let formattedUrl = url;
    if (!formattedUrl.match(/^https?:\/\//)) {
      formattedUrl = "http://" + formattedUrl;
    }
    if (!formattedUrl.match(/:\d+$/)) {
      formattedUrl = formattedUrl.replace(/\/?$/, `:${DEFAULT_PORT}`);
    }

    saveSettings({ otherOptions_desktopAppURL: formattedUrl });
    setInputValue(formattedUrl);
  };

  const handleManualSubmit = () => {
    setDesktopAppURL(inputValue);
  };

  // 同期実行ハンドラー
  const handleSync = async (isFull: boolean) => {
    try {
      await syncLogs(isFull);
      showToast("success", t("common.success", "Success"), t("pages.setting_desktopapp.toast_sync_success", "Sync completed."));
    } catch (error) {
      showToast("error", t("common.error", "Error"), String(error));
    }
  };

  return (
    <GenericScreen>
      <View style={styles.container}>

        {/* 説明テキスト */}
        <View style={styles.headerContainer}>
          <Text style={[styles.description, { color: colors.text }]}>
            {t("pages.setting_desktopapp.description")}
          </Text>
        </View>

        {/* 1. QRコードで読み込むボタン */}
        <TouchableEx
          style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setIsScannerOpen(true)}
          disabled={isSyncing}
        >
          <IconSymbol name="qrcode-scan" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>{t("pages.setting_desktopapp.button_scan_qr")}</Text>
        </TouchableEx>

        <View style={styles.divider}>
          <Text style={[styles.dividerText, { color: colors.border }]}>
            {t("pages.setting_desktopapp.divider_or")}
          </Text>
        </View>

        {/* 2. テキストで直打ちするエリア */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            <IconSymbol name="keyboard" size={16} color={colors.text} style={{ marginRight: 4 }} />
            {t("pages.setting_desktopapp.label_server_url")}
          </Text>

          <View style={[styles.textInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <IconSymbol name="link" size={18} color={colors.text} style={{ opacity: 0.5, marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={inputValue}
              onChangeText={setInputValue}
              onEndEditing={handleManualSubmit}
              placeholder={`http://192.168.x.x:${DEFAULT_PORT}`}
              placeholderTextColor={colors.border}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
              editable={!isSyncing}
            />
          </View>
          <Text style={[styles.helperText, { color: colors.notification }]}>
            {t("pages.setting_desktopapp.helper_format_auto")}
          </Text>
        </View>

        {/* 3. 手動同期エリア */}
        <View style={styles.divider}>
          <Text style={[styles.dividerText, { color: colors.border }]}>- SYNC -</Text>
        </View>

        <View style={styles.syncContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            <IconSymbol name="cloud-sync" size={16} color={colors.text} style={{ marginRight: 4 }} />
            {t("pages.setting_desktopapp.label_sync", "Log Sync")}
          </Text>

          <View style={styles.syncButtonRow}>
            <TouchableEx
              style={[styles.syncButton, { backgroundColor: colors.primary, opacity: isSyncing ? 0.6 : 1 }]}
              onPress={() => handleSync(false)}
              disabled={isSyncing}
            >
              <Text style={styles.syncButtonText}>{t("pages.setting_desktopapp.button_sync_normal")}</Text>
            </TouchableEx>

            <TouchableEx
              style={[styles.syncButton, { backgroundColor: colors.notification, opacity: isSyncing ? 0.6 : 1 }]}
              onPress={() => handleSync(true)}
              disabled={isSyncing}
            >
              <Text style={styles.syncButtonText}>{t("pages.setting_desktopapp.button_sync_full")}</Text>
            </TouchableEx>
          </View>

          {/* プログレス表示 */}
          {(isSyncing || syncProgress !== "") && (
            <View style={styles.progressContainer}>
              {isSyncing && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
              <Text style={[styles.progressText, { color: colors.text }]}>
                {t("pages.setting_desktopapp.sync_status", { progress: syncProgress })}
              </Text>
            </View>
          )}
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
    marginBottom: 0,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
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
    opacity: 0.8,
    textAlign: 'right',
  },
  syncContainer: {
    gap: 12,
  },
  syncButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  progressText: {
    fontSize: 13,
    opacity: 0.8,
  }
});
