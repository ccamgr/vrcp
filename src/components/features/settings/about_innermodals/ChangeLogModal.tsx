import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

import rawVersions from '@/../versions.json'; 
import GenericModal from '@/components/layout/GenericModal';
import { useTranslation } from 'react-i18next';

interface UpdateEntry {
  date: string;
  message: string;
}

interface VersionSection {
  title: string;
  data: UpdateEntry[];
}

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function ChangeLogModal({ open, setOpen }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Transform versions.json structure for SectionList
  const sections: VersionSection[] = useMemo(() => {
    // versions.json might be empty or undefined check
    if (!rawVersions?.versions) return [];

    return rawVersions.versions.map((v) => ({
      title: v.nativeVersion,
      data: v.updates,
    }));
  }, []);

  // Header for each version block (e.g. "Ver 1.0.0")
  const renderSectionHeader = ({ section: { title } }: { section: VersionSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.versionBadge, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.versionText}>{t("components.aboutModal.innerModals.changeLog.format_version", { version: title })}</Text>
      </View>
      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
    </View>
  );

  // Individual update item
  const renderItem = ({ item, index, section }: { item: UpdateEntry, index: number, section: VersionSection }) => {
    const isLastItem = index === section.data.length - 1;
    
    return (
      <View style={[
        styles.itemContainer, 
        // Remove border for the last item in the section to look cleaner
        !isLastItem && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
      ]}>
        <Text style={[styles.date, { color: theme.colors.primary }]}>
          {t("components.aboutModal.innerModals.changeLog.format_date", { date: new Date(item.date) })}
        </Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {item.message}
        </Text>
      </View>
    );
  };

  return (
    <GenericModal
      title={t("components.aboutModal.innerModals.changeLog.title")}
      showCloseButton
      open={open}
      onClose={() => setOpen(false)}
    >
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.date + index}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false} // Disable sticky headers for better UX
      />
    </GenericModal>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  versionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  separator: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  itemContainer: {
    paddingVertical: 12,
    paddingLeft: 4,
  },
  date: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
});