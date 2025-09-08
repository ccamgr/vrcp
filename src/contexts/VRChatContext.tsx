// VRCのAPIを使うためのContext
import { AuthenticationApi, AvatarsApi, Configuration, FavoritesApi, FriendsApi, GroupsApi, InstancesApi, InviteApi, UsersApi, WorldsApi } from "@/vrchat/api";
import { PipelineMessage } from "@/vrchat/pipline/type";
import Constants from "expo-constants";
import { createContext, ReactNode, useContext, useRef, useState } from "react";


type Socket = string; // or other WebSocket implementation

const BASE_PIPELINE_URL = "wss://pipeline.vrchat.cloud";
const BASE_API_URL = "https://api.vrchat.cloud/api/1";

interface Pipeline {
  socket: Socket | null;
  lastMessage: PipelineMessage<any> | null;
  sendMessage?: (msg: object) => void; // not implemented for vrcapi
}

export interface VRChatContextType {
  config: Configuration | undefined;
  configureAPI: (user: { username?: string; password?: string }) => Configuration;
  configurePipeline: (url: string) => void;
  unConfigure: () => void;
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
  // pipeline
  pipeline : Pipeline;

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
  const name = Constants.expoConfig?.slug + Constants.expoConfig?.extra?.vrcmm?.buildProfile;
  const version = Constants.expoConfig?.version || "0.0.0-dev";
  const contact = Constants.expoConfig?.extra?.vrcmm?.contact || "dev@ktrn.dev";
  const [config, setConfig] = useState<Configuration>();
  const socketRef = useRef<Socket | null>(null);
  const authTokenRef = useRef<string | null>(null); // authToken for pipeline
  const [lastJsonMessage, setLastJsonMessage] = useState<PipelineMessage<any> | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 10;

  const configureAPI = (user: { username?: string; password?: string }) => {
    const newConfig = new Configuration({
      // basePath: BASE_API_URL, // default
      username: user.username,
      password: user.password,
      baseOptions: {
        headers: {"User-Agent": `${name}/${version} ${contact}`},
      }
    });
    setConfig(newConfig); // 即時更新
    return newConfig;
  }

  // Pipeline(Websocket)  https://vrchat.community/websocket
  const configurePipeline = (authToken: string) => {
    authTokenRef.current = authToken;
    createSocket();
    console.log("Configure VRChatContext with authToken:", authTokenRef.current);
  }

  const createSocket = () => {
    if (socketRef.current) return ;
    socketRef.current = "dummy"
  }

  const unConfigure = () => {
    console.log("Unconfigure VRChatContext");
    setConfig(undefined);
    authTokenRef.current = null;
    if (socketRef.current) socketRef.current = null;
  }

  return (
    <Context.Provider value={{
      config,
      configureAPI,
      configurePipeline,
      unConfigure,
      // https apis
      authenticationApi: new AuthenticationApi(config),
      worldsApi: new WorldsApi(config),
      avatarsApi: new AvatarsApi(config),
      usersApi: new UsersApi(config),
      favoritesApi: new FavoritesApi(config),
      friendsApi: new FriendsApi(config),
      groupsApi: new GroupsApi(config),
      instancesApi: new InstancesApi(config),
      inviteApi: new InviteApi(config),
      // pipeline
      pipeline: {
        socket: socketRef.current,
        lastMessage: lastJsonMessage,
        sendMessage: undefined, // not implemented for vrcapi
      }
    }}>
      {children}
    </Context.Provider>
  )
} 



export { useVRChat, VRChatProvider };

