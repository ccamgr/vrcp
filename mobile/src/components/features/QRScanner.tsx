import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@react-navigation/native';

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onScan: (data: string) => void;
  continuous?: boolean;
};
/**
 * QRコードスキャナーコンポーネント
 * @param onScan スキャン成功時に呼ばれるコールバック関数。スキャンしたデータを引数として受け取る。
 * @param open モーダルの開閉状態を制御するフラグ
 * @param setOpen モーダルの開閉状態を変更する関数
 * @param continuous 連続スキャンモードを有効にするかどうかのフラグ。trueの場合、スキャン成功後もモーダルが閉じず、再度スキャン可能になる。
 *
 */
export default function QRScanner({ open, setOpen, onScan, continuous = false }: Props) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // モーダルが開かれた時の自動権限チェック & リクエスト処理
  useEffect(() => {
    if (!open) return;

    const checkPermission = async () => {
      // 1. 権限情報のロード待ち（ロード中は処理しない）
      if (!permission) return;

      // 2. 既に許可されている場合はスキャン状態をリセットして終了
      if (permission.granted) {
        setScanned(false);
        return;
      }

      // 3. 許可されていない場合、自動的にリクエストする
      const result = await requestPermission();

      // 4. 結果、許可が得られなかった場合はアラートを出して閉じる
      if (!result.granted) {
        Alert.alert(
          "カメラの使用許可が必要です",
          "QRコードを読み取るには設定からカメラの許可をオンにしてください。",
          [{ text: "閉じる", onPress: () => setOpen(false) }]
        );
      }
    };

    checkPermission();
  }, [open, permission]); // permissionの状態が変わった時（ロード完了時など）も再チェック

  // スキャン成功時のハンドラ
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    onScan(data);
    if (continuous) {
      setTimeout(() => setScanned(false), 1000); // 1秒後に再スキャン可能に
    } else {
      setOpen(false);
    }
  };

  // --------------------------------------------------------
  // レンダリング制御
  // --------------------------------------------------------

  // 1. 権限がない、またはロード中の場合
  // 自動処理中なので、ユーザーには「準備中」のような画面（または真っ黒）を見せておく
  if (!permission || !permission.granted) {
    return (
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          {/* 必要であればここに <ActivityIndicator /> を置く */}
        </View>
      </Modal>
    );
  }

  // 2. 権限がある場合（カメラ画面を表示）
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setOpen(false)}
    >
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        <SafeAreaView style={styles.overlay}>
          {/* 閉じるボタン */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeButton}>
              <Text style={{ color: theme.colors.text, fontSize: 24 }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* ガイド枠 */}
          <View style={styles.centerContent}>
            <View style={styles.scanFrame} />
            <Text style={styles.guideText}>QRコードを枠に合わせてください</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  loadingContainer: { flex: 1, backgroundColor: 'black' }, // 権限チェック中の背景
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { alignItems: 'flex-end', padding: 20 },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  centerContent: { alignItems: 'center', paddingBottom: 100 },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  guideText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
