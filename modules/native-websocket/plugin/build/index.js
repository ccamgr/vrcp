"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withIOS = (config, extra) => {
    config = (0, config_plugins_1.withInfoPlist)(config, (config) => {
        config.modResults["MODULE_KEY"] = extra.moduleKey;
        return config;
    });
    return config;
};
const withAndroid = (config, extra) => {
    config = (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const mainApplication = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
        config_plugins_1.AndroidConfig.Manifest.addMetaDataItemToMainApplication(mainApplication, "MODULE_KEY", extra.moduleKey);
        return config;
    });
    config = (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
        const buildGradle = config.modResults.contents;
        if (buildGradle.includes('com.squareup.okhttp3:okhttp'))
            return config;
        config.modResults.contents = buildGradle.replace(`dependencies {`, `dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.11.0")`);
        return config;
    });
    //
    return config;
};
// apply config plugin
const withModuleConfig = (config, extra) => {
    if (config.ios)
        config = withIOS(config, extra);
    if (config.android)
        config = withAndroid(config, extra);
    return config;
};
exports.default = withModuleConfig;
