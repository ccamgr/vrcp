import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

// generated license data by "make gen-oss" command
import rawLicenses from '@/assets/licenses.json';
import { useToast } from '@/contexts/ToastContext';
import GenericModal from '@/components/layout/GenericModal';
import { useTranslation } from 'react-i18next';

interface LicenseData {
  key: string;
  name: string;
  version: string;
  licenses: string;
  repository?: string;
  publisher?: string;
  url?: string;
}

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function LicenseModal({ open, setOpen }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const {showToast} = useToast();

  const licenses = useMemo(() => {
    return Object.keys(rawLicenses).map((key) => {
      const item = rawLicenses[key as keyof typeof rawLicenses];
      
      // parse "package-name@1.2.3"
      const atIndex = key.lastIndexOf('@');
      const name = key.substring(0, atIndex);
      const version = key.substring(atIndex + 1);

      return {
        ...item,
        key,
        name,
        version,
      } as LicenseData;
    });
  }, []);

  const renderItem = ({ item }: { item: LicenseData }) => {
    const handlePress = () => {
      if (item.url) {
        Linking.openURL(item.url).catch(err => showToast("error", "Failed to open URL"));
      }
    };

    return (
      <TouchableOpacity 
        style={[styles.itemContainer, { borderBottomColor: theme.colors.border }]}
        onPress={handlePress}
        disabled={!item.url}
      >
        <View style={styles.header}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.version, { color: theme.colors.text }]}>v{item.version}</Text>
        </View>
        
        <View style={styles.details}>
          <Text style={[styles.licenseType, { color: theme.colors.primary }]}>
            {item.licenses}
          </Text>
          {item.publisher && (
            <Text style={[styles.publisher, { color: theme.colors.text }]}>
              {item.publisher}
            </Text>
          )}
        </View>
        
        {item.url && (
          <Text style={[styles.linkHint, { color: theme.colors.border }]}>
            {t("components.aboutModal.innerModals.licenses.link_to_repos")}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <GenericModal
      title={t("components.aboutModal.innerModals.licenses.title")}
      showCloseButton
      open={open}
      onClose={() => setOpen(false)}
    >
      <FlatList
        data={licenses}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </GenericModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  itemContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  version: {
    fontSize: 12,
    opacity: 0.7,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  licenseType: {
    fontSize: 14,
    marginRight: 10,
    fontWeight: '600',
  },
  publisher: {
    fontSize: 12,
    opacity: 0.6,
  },
  linkHint: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
});