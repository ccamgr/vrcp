import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { User, UserStatus } from "@/vrchat/api";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { json } from "drizzle-orm/gel-core";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { TextInput } from "react-native-gesture-handler";
import JSONTree, { Renderable } from 'react-native-json-tree';
import * as Clipboard from 'expo-clipboard';
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  data: any;
}

const JsonDataModal = ({ open, setOpen, data }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const handleCopy = async (value: Renderable) => {
    if (
      value !== 'null' 
      && value !== 'true' 
      && value !== 'false' 
      && value !== 'undefined'
      && typeof value !== 'number'
    ) {
      value = value?.toString()?.slice(1, -1) || '';
    }
    await Clipboard.setStringAsync(String(value));
    showToast("info", "Copied to clipboard", String(value).slice(0, 50) + (String(value).length > 50 ? "..." : ''));
  }

  const handleCopyAll = async () => {
    const jsonString = JSON.stringify(data, null, 2);
    await Clipboard.setStringAsync(jsonString);
    showToast("info", "Copied all JSON to clipboard", jsonString.slice(0, 50) + (jsonString.length > 50 ? "..." : ''));
  }


  const footerButtons: ButtonItemForFooter[] = [
    {
      title: t("components.jsonDataModal.button_close"),
      onPress: () => setOpen(false), 
      color: theme.colors.text,
    },
    {
      title: t("components.jsonDataModal.button_copy"),
      onPress: handleCopyAll, 
      color: theme.colors.text,
      flex: 1,
    },
  ]
  return (
    <GenericModal scrollable="both" buttonItems={footerButtons} open={open} onClose={() => setOpen(false)}>

      <JSONTree 
        data={data}
        hideRoot
        theme={jsonTheme} 
        invertTheme={false}
        getItemString={(type, data, itemType, itemString) => 
          <Text style={{color: jsonTheme.base03}}>{itemType} {itemString}</Text>
        }
        valueRenderer={(value) => (
          <Text style={getStyleForValue(value)} onLongPress={() => handleCopy(value)}>
            {String(value)}
          </Text>
        )}
      />

    </GenericModal>
  );
};

const getStyleForValue = (value: Renderable) => {
  const type = typeof value;
  
  if (value === 'null') return { color: jsonTheme.base08 }; // Null
  if (value === 'true' || value === 'false') return { color: jsonTheme.base0E }; // Boolean
  if (type === 'string') return { color: jsonTheme.base0B }; // String
  if (type === 'number') return { color: jsonTheme.base09 }; // Number
  
  return { color: jsonTheme.base08 }; // その他
};

const jsonTheme = {scheme: 'custom_dark',
  author: 'me',
  
  // --- 背景と基本 ---
  base00: '#1e1e1e', // 【背景】

  // --- 値のデータ型による色分け ---
  base0B: '#ce9178', // 【文字列】"hoge" 
  base09: '#b5cea8', // 【数値/Bool】123, true 
  base08: '#6170a3ff', // 【null/undefined】null, undefined 

  
  // --- キー（プロパティ名） ---
  base0D: '#9cdcfe', // 【キー】"userId": (水色)
  
  // --- その他 ---
  
  base01: '#383830',
  base02: '#49483e',
  base03: '#c0c2bfff',
  base04: '#a59f85',
  base05: '#f8f8f2',
  base06: '#f5f4f1',
  base07: '#d4d4d4',
  base0A: '#f4bf75',
  base0C: '#a1efe4',
  base0E: '#4882feff',
  base0F: '#cc6633'
}
const styles = StyleSheet.create({
  container: {
  },
  content: {
  },
  
});

export default JsonDataModal;
