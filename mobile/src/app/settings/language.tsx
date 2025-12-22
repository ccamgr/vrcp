import { TouchableEx } from "@/components/CustomElements";
import GenericScreen from "@/components/layout/GenericScreen";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import i18n, { getUserLanguage, setUserLanguage, translateResources } from "@/i18n";
import { useTheme } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

const langNames = Object.keys(translateResources).map((langTag) => {
  const res = translateResources[langTag];
  //@ts-ignore
  const displayName = res.translation["_langDisplayName_"] as string || langTag;
  return { langTag, displayName };
});


export default function LanguageSettings() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [ selectedLang, setSelectedLang ] = useState<string>(i18n.language);
  const [ isLoading, setIsLoading ] = useState<boolean>(false);
  const onPress = async (langTag: string) => {
    try {
      setIsLoading(true);
      setSelectedLang(langTag);
      await setUserLanguage(langTag);
    } catch (error) {
      console.error("Failed to set user language:", error);
      setSelectedLang(i18n.language);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GenericScreen>
      {isLoading && <LoadingIndicator absolute />}
      {/* Language Selection */}
      <View style={{ padding: 16 }}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{t("pages.setting_language.description")}</Text>
        <FlatList
          data={langNames}
          keyExtractor={(item) => item.langTag}
          renderItem={({ item }) => (
            <TouchableEx
              style={styles.languageItem}
              onPress={() => onPress(item.langTag)}
            >
              <Text
                style={[
                  styles.languageText,
                  { color:
                    item.langTag === selectedLang ? theme.colors.primary
                    : theme.colors.text
                  }
                ]}
              >
                {item.displayName}
              </Text>
            </TouchableEx>
          )}
        />
      </View>
    </GenericScreen>
  );
}
const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  languageItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  languageText: {
    fontSize: 16,
  },
});
