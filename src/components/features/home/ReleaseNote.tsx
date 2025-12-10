import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

// ルートの json を読み込み
import rawVersions from '@/../versions.json'; 
import GenericModal from '@/components/layout/GenericModal';
import { isNewVersion, updateLastVersion } from '@/libs/utils';
import { radius, spacing } from '@/configs/styles';
import { useTranslation } from 'react-i18next';

export default function ReleaseNote() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ open, setOpen ] = useState<boolean>(false);

  useEffect(() => {
    setOpen(isNewVersion());
    // setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
    updateLastVersion();
  }

  // 最新のバージョンブロック（配列の先頭）を取得
  const latestVersion = useMemo(() => {
    return rawVersions?.versions?.[0] || null;
  }, []);

  if (!latestVersion) return null;

  return (
    <GenericModal
      title={t('components.releaseNote.title')} // タイトルもお知らせ風に
      open={open}
      onClose={handleClose}
      showCloseButton={false} // 下部に大きな閉じるボタンを置くので、右上の×は隠しても良いかも
    >
      <View style={styles.container}>
        {/* ヘッダー部分: バージョン番号を目立たせる */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.versionText, { color: theme.colors.primary }]}>
              v{latestVersion.nativeVersion}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* コンテンツ部分: 更新内容のリスト */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {latestVersion.updates.map((update, index) => (
            <View key={index} style={styles.updateItem}>
              <Text style={[styles.date, { color: theme.colors.notification }]}>
                {update.date}
              </Text>
              <Text style={[styles.message, { color: theme.colors.text }]}>
                {update.message}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* フッター: 閉じるボタン */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleClose}
        >
          <Text style={styles.closeButtonText}>{t('components.releaseNote.button_close')}</Text>
        </TouchableOpacity>
      </View>
    </GenericModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.medium,
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.medium,
    // justifyContent: 'center',
  },
  updateText: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
    opacity: 0.5,
  },
  scrollView: {
    marginBottom: spacing.small,
  },
  scrollContent: {
    paddingBottom: spacing.small,
  },
  updateItem: {
    marginBottom: spacing.medium,
  },
  date: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: spacing.small,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  closeButton: {
    paddingVertical: spacing.medium,
    borderRadius: radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});