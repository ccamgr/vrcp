import { ConfigContext } from "@expo/config";
import * as fs from 'fs';
import * as path from 'path';

interface ProfileSwitch<T = any> { development: T; preview: T; production: T; }


// extract from ./versions.json
const getVersionFromJSON = (): string => {
  try {
    const versionsContent = fs.readFileSync(path.join(__dirname, 'versions.json'), 'utf-8');
    const latestVersion = JSON.parse(versionsContent).versions[0].nativeVersion;
    return latestVersion;
  } catch (error) {
    console.warn('Warning: Could not load versions.json. Fallback to default version.');
    return '0.0.1'; // 読み込めなかった場合のフォールバック
  }
};
const appVersion = getVersionFromJSON();

const appIdentifier: ProfileSwitch<string> = {
  development: "cc.amgr.vrcp.mobile.dev",
  preview: "cc.amgr.vrcp.mobile.pre",
  production: "cc.amgr.vrcp.mobile"
}
const appName: ProfileSwitch<string> = {
  development: "VRCP-dev",
  preview: "VRCP-pre",
  production: "VRCP"
}
const appIcons: ProfileSwitch<{
  appIcon: string,
  foregroundImage: string,
  backgroundImage: string,
  monochromeImage: string,
}> = {
  development: {
    appIcon: "./src/assets/images/icon-dev.png",
    foregroundImage: "./src/assets/images/adaptive-icon-fg.png",
    backgroundImage: "./src/assets/images/adaptive-icon-bg-dev.png",
    monochromeImage: "./src/assets/images/adaptive-icon-mono.png",
  },
  preview: {
    appIcon: "./src/assets/images/icon.png",
    foregroundImage: "./src/assets/images/adaptive-icon-fg.png",
    backgroundImage: "./src/assets/images/adaptive-icon-bg.png",
    monochromeImage: "./src/assets/images/adaptive-icon-mono.png",
  },
  production: {
    appIcon: "./src/assets/images/icon.png",
    foregroundImage: "./src/assets/images/adaptive-icon-fg.png",
    backgroundImage: "./src/assets/images/adaptive-icon-bg.png",
    monochromeImage: "./src/assets/images/adaptive-icon-mono.png",
  }
}

const profile = (process.env.BUILD_PROFILE || "development") as keyof ProfileSwitch; // must be "development" | "preview" | "production"

export default ({ config }: ConfigContext) => ({
  name: appName[profile],
  slug: "vrcp",
  version: appVersion,
  orientation: "portrait",
  icon: appIcons[profile].appIcon,
  scheme: "vrcp", // This is used for deep linking (ex. schema://internal/link)
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  owner: "amgr-cc",
  updates: { // configure EAS Update
    url: "https://u.expo.dev/5dcb6ea7-b710-4155-9dc5-e4c5a9ce160d"
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  extra: {
    vrcp: {// custom constants accessible via Constants.expoConfig.extra.vrcp
      buildProfile: profile,
    },
    eas: {
      projectId: "5dcb6ea7-b710-4155-9dc5-e4c5a9ce160d"
    },
  },
  ios: {
    bundleIdentifier: appIdentifier[profile],
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ["fetch", "processing"], // for background fetch
      BGTaskSchedulerPermittedIdentifiers: ["BACKGROUND_FETCH_TASK"], // must match the task name defined in src/tasks/
      LSApplicationQueriesSchemes: ["vrcp"], // allow querying for our own scheme
    },
  },
  android: {
    package: appIdentifier[profile],
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: appIcons[profile].foregroundImage,
      backgroundImage: appIcons[profile].backgroundImage,
      monochromeImage: appIcons[profile].monochromeImage,
    },
    permissions: [
      "RECEIVE_BOOT_COMPLETED", // work on device reboot for background fetch
      "WAKE_LOCK",              // keep device awake for background fetch
      "VIBRATE"                 // for haptic feedback
    ]
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./src/assets/images/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-font",
    "expo-localization",
    "expo-background-task",
    [
      "expo-build-properties",
      {
        android: {
          javaMaxHeapSize: "4g" // increase max heap size for Gradle to prevent OOM errors
        },
        ios: {
          useFrameworks: "static" // may need to enable new architecture
        }
      }
    ],
    [
      "expo-notifications",
      {
        icon: "./src/assets/images/notification-icon.png", // must be a transparent white PNG
        color: "#ffffff"
      }
    ],
    [
      'expo-camera',
      {
        cameraPermission: "allow $(PRODUCT_NAME) to access your camera to read QR codes",
        // microphonePermission: "allow $(PRODUCT_NAME) to access your microphone" // if you need microphone access
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./src/assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  }
});
