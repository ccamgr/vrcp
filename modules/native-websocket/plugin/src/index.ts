import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withInfoPlist
} from "@expo/config-plugins";
import { ExpoConfig } from "@expo/config-types";

type Config = {
  apiKey: string;
};



const withIOS = (config: ExpoConfig, ios: Config) => {
  config = withInfoPlist(config, (config) => {
    config.modResults["SUGOI_SDK_API_KEY"] = ios.apiKey;
    return config;
  });
  //
  return config;
}

const withAndroid = (config: ExpoConfig, android: Config) => {
  config = withAndroidManifest(config, (config) => { // Api key
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      "SUGOI_SDK_API_KEY",
      android.apiKey
    );
    return config;
  });
  config = withAppBuildGradle(config, (config) => { // add dependency for okhttp
    const buildGradle = config.modResults.contents;
    if (buildGradle.includes('com.squareup.okhttp3:okhttp')) return config;
    config.modResults.contents = buildGradle.replace(
      `dependencies {`,
      `dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")`
    );
    return config;
  });


  //
  return config;
}





// apply config plugin
const withModuleConfig: ConfigPlugin<{
  ios: Config;
  android: Config;
}> = (config, { ios, android }) => {
  config = withIOS(config, ios);
  config = withAndroid(config, android);
  return config;
};

export default withModuleConfig;
