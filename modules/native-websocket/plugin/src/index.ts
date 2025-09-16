import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withInfoPlist,
} from "@expo/config-plugins";

type Config = {
  apiKey: string;
};

const withNativeWebsocketModuleConfig: ConfigPlugin<{
  ios: Config;
  android: Config;
}> = (config, { ios, android }) => {
  config = withInfoPlist(config, (config) => {
    // Info.plistにAPIキーを追加
    config.modResults["SUGOI_SDK_API_KEY"] = ios.apiKey;
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );
    // AndroidManifestにAPIキーを追加
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      "SUGOI_SDK_API_KEY",
      android.apiKey
    );
    return config;
  });
  return config;
};

export default withNativeWebsocketModuleConfig;
