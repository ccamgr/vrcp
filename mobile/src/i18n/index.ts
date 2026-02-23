import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { Storage } from "expo-sqlite/kv-store";
import { format, Locale } from 'date-fns';

// Import translation files
import enGB_translate from './locales/en-GB.json';
import enUS_translate from './locales/en-US.json';
import deDE_translate from './locales/de-DE.json';
import jaJP_translate from './locales/ja-JP.json';
import koKR_translate from './locales/ko-KR.json';
import ruRU_translate from './locales/ru-RU.json';
import zhCN_translate from './locales/zh-CN.json';
import zhTW_translate from './locales/zh-TW.json';


// Import date-fns locales
import { de, enGB, enUS, ja, ko, ru, zhCN, zhTW } from 'date-fns/locale';
import { ResourceLanguage } from 'i18next';


// https://en.wikipedia.org/wiki/IETF_language_tag
type LanguageTag = string

interface TranslateResource extends ResourceLanguage {
  name: string;
  datefnsLocale: Locale;
}

const LANGUAGE_KEY = 'vrcp_user_language';
const defaultLang = "en-US";
export const translateResources: { [key: LanguageTag]: TranslateResource } = {
  "en-GB": { name: 'English (UK)', translation: enGB_translate, datefnsLocale: enGB },
  "en-US": { name: 'English (US)', translation: enUS_translate, datefnsLocale: enUS },
  "de-DE": { name: 'Deutsch', translation: deDE_translate, datefnsLocale: de },
  "ja-JP": { name: '日本語', translation: jaJP_translate, datefnsLocale: ja },
  "ko-KR": { name: '한국어', translation: koKR_translate, datefnsLocale: ko },
  "ru-RU": { name: 'Русский', translation: ruRU_translate, datefnsLocale: ru },
  "zh-CN": { name: '简体中文', translation: zhCN_translate, datefnsLocale: zhCN },
  "zh-TW": { name: '繁體中文', translation: zhTW_translate, datefnsLocale: zhTW },
};


export const setUserLanguage = async (lang: LanguageTag) => {
  await Storage.setItemAsync(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}
export const getUserLanguage = async (): Promise<LanguageTag> => {
  return i18n.language
}
const initUserLanguage = async (): Promise<LanguageTag> => {
  const storedLang = await Storage.getItemAsync(LANGUAGE_KEY);
  const deviceLang = Localization.getLocales()[0]?.languageTag;
  if ((storedLang || deviceLang) in translateResources) {
    return storedLang || deviceLang;
  } else {
    return defaultLang;
  }
}


const initI18n = async () => {
  const userLang = await initUserLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources: translateResources,
      lng: userLang, // 初期言語
      fallbackLng: defaultLang,  // 対応していない言語の場合のフォールバック
      interpolation: {
        escapeValue: false,
        format: (value, formatStr, lng) => {
          if (value instanceof Date && formatStr) {
            const locale = translateResources[lng || defaultLang].datefnsLocale;
            return format(value, formatStr, { locale });
          }
          return value;
        },
      },
      compatibilityJSON: 'v4',
    });
};

initI18n();

export default i18n;
