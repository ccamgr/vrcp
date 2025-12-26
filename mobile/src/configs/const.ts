import Constants from "expo-constants";


interface AppConfig {
  name: string;
  version: string;
  contact: string;
  externalLinks: {
    vrc_register: string;
    vrc_forgot_password: string;
    vrc_forgot_email: string;
    privacy_policy: string;
    terms_of_use: string;
  };
}

interface ProfileSwitch<T = any> {development: T; preview: T; production: T;}

const buildProfile = Constants.expoConfig?.extra?.vrcp?.buildProfile as keyof ProfileSwitch || "development";

const contact: ProfileSwitch<string> = {
  development: "dev@amgr.cc",
  preview: "dev@amgr.cc",
  production: "contact@amgr.cc",
}

export const constants: AppConfig = {
  name: Constants.expoConfig?.name || "VRCP",
  version: Constants.expoConfig?.version || "0.0.0-dev",
  contact: contact[buildProfile],
  externalLinks: {
    vrc_register: "https://vrchat.com/home/register",
    vrc_forgot_password: "https://vrchat.com/home/password",
    vrc_forgot_email: "https://vrchat.com/home/forgot-email",
    privacy_policy: "https://amgr-cc.github.io/vrcp/privacy-policy",
    terms_of_use: "https://amgr-cc.github.io/vrcp/terms-of-use",
  }
}
