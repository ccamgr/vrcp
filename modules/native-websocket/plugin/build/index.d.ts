import { ConfigPlugin } from "@expo/config-plugins";
type ExtraConfig = {
    moduleKey: string;
};
declare const withModuleConfig: ConfigPlugin<ExtraConfig>;
export default withModuleConfig;
