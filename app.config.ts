import { ConfigContext } from "@expo/config";

interface ProfileSwitch<T = any> {development: T; preview: T; production: T;}

const appIdentifier: ProfileSwitch<string> = {
  development: "dev.ktrn.vrcmm.dev",
  preview: "dev.ktrn.vrcmm.pre",
  production: "dev.ktrn.vrcmm"
}
const appName: ProfileSwitch<string> = {
  development: "VRCMM(dev)",
  preview: "VRCMM(pre)",
  production: "VRCMM"
}
const contact: ProfileSwitch<string> = {
  development: "dev@ktrn.dev",
  preview: "dev@ktrn.dev",
  production: "contact@ktrn.dev"
}

const profile = (process.env.BUILD_PROFILE || "development") as keyof ProfileSwitch; // must be "development" | "preview" | "production"

export default ({ config }: ConfigContext) => ({
    name: appName[profile],
    slug: "vrcmm",
    version: "0.0.1",
    orientation: "portrait",
    icon: "./src/assets/images/icon.png",
    scheme: "vrcmm", // This is used for deep linking (ex. schema://internal/link)
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    owner: "ktrn-dev",
    extra: {
      vrcmm: {// custom constants accessible via Constants.expoConfig.extra.vrcmm
        buildProfile: profile,
        contact: contact[profile],  
      },
      eas: {
        projectId: "acd8a179-f1e0-4dc6-aad8-b201b899ce14"
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: appIdentifier[profile],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/images/adaptive-icon-fg.png",
        backgroundImage: "./src/assets/images/adaptive-icon-bg.png",
        monochromeImage: "./src/assets/images/adaptive-icon-mono.png",
      },
      edgeToEdgeEnabled: true,
      package: appIdentifier[profile],
      apiKey: "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww", // dummy, will be replaced by build plugin
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./src/assets/images/favicon.png"
    },
    plugins: [
      "./modules/native-websocket/app.plugin.js", // local plugin
      "expo-router",
      "expo-secure-store",
      "expo-sqlite",
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
