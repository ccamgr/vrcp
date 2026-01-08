import { createContext, useContext, useEffect, useState } from "react";
import { vrcColors } from "@/configs/vrchat";
import { mergeWithDefaults } from "@/lib/utils";
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { de } from "date-fns/locale";



// provide user settings globally,

type HomeTabVariant = "friend-locations" | "feeds" | "events";

export interface Setting {
  // ui
  uiOptions_homeTabTopVariant: HomeTabVariant;
  uiOptions_homeTabBottomVariant: HomeTabVariant;
  uiOptions_homeTabSeparatePos: number;
  uiOptions_cardViewColumns: number;
  uiOptions_colorSchema: "light" | "dark" | "system";
  uiOptions_friendColor: string;
  uiOptions_favoriteFriendsColors: { [friendId: string]: string };
  // notifications
  notificationOptions_usePushNotification: boolean;
  notificationOptions_allowedNotificationTypes: string[];
  // pipeline
  pipelineOptions_keepMsgNum: number;
  pipelineOptions_enableOnBackground: boolean;
  // other
  otherOptions_desktopAppURL: string | null;
  otherOptions_sendDebugLogs: boolean;
  otherOptions_enableJsonViewer: boolean;
}

export type SettingKey = keyof Setting;

const defaultSettings: Setting = {
  uiOptions_homeTabTopVariant: "events",
  uiOptions_homeTabBottomVariant: "friend-locations",
  uiOptions_homeTabSeparatePos: 30,
  uiOptions_cardViewColumns: 2,
  uiOptions_colorSchema: "system",
  uiOptions_friendColor: vrcColors.friend,
  uiOptions_favoriteFriendsColors: {},
  notificationOptions_usePushNotification: false,
  notificationOptions_allowedNotificationTypes: [],
  pipelineOptions_keepMsgNum: 100,
  pipelineOptions_enableOnBackground: false,
  otherOptions_desktopAppURL: null,
  otherOptions_sendDebugLogs: false,
  otherOptions_enableJsonViewer: false,
}

interface SettingContextType {
  settings: Setting;
  defaultSettings: Setting;
  saveSettings: (newSettings: Partial<Setting>) => Promise<void>;
  loadSettings: () => Promise<Setting>;
}
const Context = createContext<SettingContextType | undefined>(undefined);

const useSetting = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useSetting must be used within a SettingContextProvider");
  return context;
}

const SettingProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Setting>(defaultSettings);
  useEffect(() => {
    // Load settings from async storage on mount
    loadSettings().then(setSettings);
  }, []);

  const saveSettings = async (newSettings: Partial<Setting>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    // Save settings to async storage
    const entries = Object.entries(newSettings).map(([key, value]) => [
      key,
      JSON.stringify(value),
    ] as [string, string]);
    await StorageWrapper.multiSet(entries);
  };

  const loadSettings = async (): Promise<Setting> => {
    // Load settings from async storage
    const storedSettings = await StorageWrapper.multiGet(
      Object.keys(defaultSettings)
    );
    const newSettings = { ...defaultSettings };
    storedSettings.forEach(([key, value]) => {
      if (value !== null && key in defaultSettings) {
        // @ts-ignore
        newSettings[key] = JSON.parse(value);
      }
    });
    console.log("Loaded settings:", JSON.stringify(newSettings, null, 2));
    return newSettings;
  }


  return (
    <Context.Provider value={{
      settings,
      defaultSettings,
      saveSettings,
      loadSettings,
    }}>
      {children}
    </Context.Provider>
  );
}

export { SettingProvider, useSetting };
