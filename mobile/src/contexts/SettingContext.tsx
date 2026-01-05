import { createContext, useContext, useEffect, useState } from "react";
import { vrcColors } from "@/configs/vrchat";
import { mergeWithDefaults } from "@/libs/utils";
import StorageWrapper from "@/libs/wrappers/storageWrapper";



// provide user settings globally,
// all data stored in async storage with prefix: "setting_"

type HomeTabVariant = "friend-locations" | "feeds" | "events";
//
interface UIOption { // layout, color schema
  layouts: {
    homeTabTopVariant: HomeTabVariant; // which variant to show on top in Home Tab
    homeTabBottomVariant: HomeTabVariant; // which variant to show on bottom in home tab
    homeTabSeparatePos: number; // percentage position to separate top and bottom in home tab, 0-100
    cardViewColumns: number; // integer, number of columns in card view
  };
  theme: {
    colorSchema: "light" | "dark" | "system";
  };
  user: {
    friendColor: string;
    favoriteFriendsColors: { [favoriteGroupId: string]: string }; // override friend color for favorite groups
    // useFriendOrder: boolean;
  };
}
interface NotificationOption {
  usePushNotification: boolean;
  allowedNotificationTypes: string[]; // e.g. ["friend-online" ]
}
interface PipelineOption {
  keepMsgNum: number; // how many feeds to keep, default 100
  enableOnBackground: boolean;
}
interface OtherOption {
  desktopAppURL: string | null;
  sendDebugLogs: boolean;
  enableJsonViewer: boolean;
}

export interface Setting {
  uiOptions: UIOption;
  notificationOptions: NotificationOption;
  pipelineOptions: PipelineOption;
  otherOptions: OtherOption;
}

const defaultSettings: Setting = {
  uiOptions: {
    layouts: {
      homeTabTopVariant: "events",
      homeTabBottomVariant: "friend-locations",
      homeTabSeparatePos: 30,
      cardViewColumns: 2,
    },
    theme: {
      colorSchema: "system",
    },
    user: {
      friendColor: vrcColors.friend,
      favoriteFriendsColors: {},
    },
  },
  notificationOptions: {
    usePushNotification: false,
    allowedNotificationTypes: [],
  },
  pipelineOptions: {
    keepMsgNum: 100,
    enableOnBackground: false,
  },
  otherOptions: {
    desktopAppURL: null,
    sendDebugLogs: false,
    enableJsonViewer: false,
  },
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
      `setting_${key}`,
      JSON.stringify(value),
    ] as [string, string]);
    await StorageWrapper.multiSet(entries);
  };

  const loadSettings = async (): Promise<Setting> => {
    // Load settings from async storage
    const storedSettings = await StorageWrapper.multiGet(
      Object.keys(defaultSettings).map(key => `setting_${key}`)
    );
    const newSettings = { ...defaultSettings };
    storedSettings.forEach(([key, value]) => {
      if (value !== null) {
        const settingKey = key.replace("setting_", "") as keyof Setting;
        newSettings[settingKey] = mergeWithDefaults(newSettings[settingKey], JSON.parse(value)) as any;
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
