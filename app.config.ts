import { ConfigContext } from "@expo/config";

interface ProfileSwitch<T = any> {development: T; preview: T; production: T;}

// Injected via CI/CD pipeline
// extracted from versions.json in the workflow and passed as env variable
const appVersion = process.env.APP_VERSION || "0.0.1";

const appIdentifier: ProfileSwitch<string> = {
  development: "dev.ktrn.vrcp.dev",
  preview: "dev.ktrn.vrcp.pre",
  production: "dev.ktrn.vrcp"
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
const contact: ProfileSwitch<string> = {
  development: "dev@ktrn.dev",
  preview: "dev@ktrn.dev",
  production: "contact@ktrn.dev"
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
    owner: "ktrn-dev",
    updates: { // configure EAS Update
      url: "https://u.expo.dev/5dcb6ea7-b710-4155-9dc5-e4c5a9ce160d"
    },
    runtimeVersion: { 
      policy: "appVersion"
    },
    extra: {
      vrcp: {// custom constants accessible via Constants.expoConfig.extra.vrcp
        buildProfile: profile,
        contact: contact[profile],  
      },
      eas: {
        projectId: "5dcb6ea7-b710-4155-9dc5-e4c5a9ce160d"
      },
    },
    ios: {
      bundleIdentifier: appIdentifier[profile],
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ["fetch"], // enable background fetch
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
      "expo-background-fetch",
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
