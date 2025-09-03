// VRCのAPIを使うためのContext
import { AuthenticationApi, AvatarsApi, Configuration, FavoritesApi, FriendsApi, GroupsApi, InstancesApi, InviteApi, UsersApi, WorldsApi } from "@/api/vrchat";
import Constants from "expo-constants";
import { createContext, ReactNode, useContext, useState } from "react";


export interface VRChatContextType {
  config: Configuration | undefined;
  configure: (user: { username?: string; password?: string }) => Configuration;
  // apis
  authenticationApi: AuthenticationApi;
  worldsApi: WorldsApi;
  avatarsApi: AvatarsApi;
  usersApi: UsersApi;
  favoritesApi: FavoritesApi;
  friendsApi: FriendsApi;
  groupsApi: GroupsApi;
  instancesApi: InstancesApi;
  inviteApi: InviteApi;

}
const Context = createContext<VRChatContextType | undefined>(undefined)

const useVRChat = () => {
  const context = useContext(Context)
  if (!context) {
    throw new Error("useVRChat must be used within a VRChatProvider")
  }
  return context
}

const VRChatProvider: React.FC<{ children?: ReactNode }> = ({children}) => {
  // setting up VRChat client with application details
  const name = Constants.expoConfig?.name || "vrcapp-dev";
  const version = Constants.expoConfig?.version || "0.0.0-dev";
  const contact = Constants.expoConfig?.extra?.contact || "dev@example.com";
  const [config, setConfig] = useState<Configuration>();
  const configure = (user: { username?: string; password?: string }) => {
    const newConfig = new Configuration({
      username: user.username,
      password: user.password,
      baseOptions: {
        headers: {"User-Agent": `${name}/${version} ${contact}`},
      }
    });
    setConfig(newConfig); // 即時更新
    return newConfig;
  }

  // [ToDo]: WebSocket

  return (
    <Context.Provider value={{
      config,
      configure,
      authenticationApi: new AuthenticationApi(config),
      worldsApi: new WorldsApi(config),
      avatarsApi: new AvatarsApi(config),
      usersApi: new UsersApi(config),
      favoritesApi: new FavoritesApi(config),
      friendsApi: new FriendsApi(config),
      groupsApi: new GroupsApi(config),
      instancesApi: new InstancesApi(config),
      inviteApi: new InviteApi(config),
    }}>
      {children}
    </Context.Provider>
  )
} 



export default useVRChat
export { VRChatProvider };

