// VRCのAPIを使うためのContext
import {
  AuthenticationApi,
  AvatarsApi,
  CalendarApi,
  Configuration,
  FavoritesApi,
  FriendsApi,
  GroupsApi,
  InstancesApi,
  InviteApi,
  NotificationsApi,
  PrintsApi,
  UsersApi,
  WorldsApi,
} from "@/generated/vrcapi";
import { PipelineMessage, PipelineRawMessage } from "@/generated/vrcpipline/type";
import {
  createContext,
  ReactNode,
  use,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from 'axios';
import { getUserAgent } from "@/libs/utils";

const BASE_PIPELINE_URL = "wss://pipeline.vrchat.cloud";
const BASE_API_URL = "https://api.vrchat.cloud/api/1";

interface Pipeline {
  client: WebSocket | null;
  lastMessage: PipelineMessage | null;
  sendMessage?: (msg: object) => void; // not implemented for vrcapi
}

export interface VRChatContextType {
  config: Configuration | undefined;
  configureAPI: (user: {
    username?: string;
    password?: string;
  }) => Configuration;
  configurePipeline: (url: string) => void;
  unConfigure: () => void;
  /** APIs */
  authenticationApi: AuthenticationApi;
  worldsApi: WorldsApi;
  avatarsApi: AvatarsApi;
  usersApi: UsersApi;
  calendarApi: CalendarApi;
  // economyApi: EconomyApi;
  favoritesApi: FavoritesApi;
  // filesApi: FilesApi;
  friendsApi: FriendsApi;
  groupsApi: GroupsApi;
  instancesApi: InstancesApi;
  // inventoryApi: InventoryApi;
  inviteApi: InviteApi;
  // jamsApi: JamsApi;
  notificationsApi: NotificationsApi;
  // playermoderationApi: PlayerModerationApi;
  printsApi: PrintsApi;
  // propsApi: PropsApi;
  // miscellaneousApi: MiscellaneousApi;

  /** Pipelines */
  pipeline: Pipeline;
}
const Context = createContext<VRChatContextType | undefined>(undefined);

const useVRChat = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useVRChat must be used within a VRChatProvider");
  return context;
};

const VRChatProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
  // setting up VRChat client with application details
  const [config, setConfig] = useState<Configuration>();

  const pipelineRef = useRef<WebSocket | null>(null);
  const authTokenRef = useRef<string | null>(null); // authToken for pipeline
  const [lastJsonMessage, setLastJsonMessage] =
    useState<PipelineMessage<any> | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const configureAPI = (user: { username?: string; password?: string }) => {
    const newConfig = new Configuration({
      // basePath: BASE_API_URL, // default
      username: user.username,
      password: user.password,
      baseOptions: {
        headers: { "User-Agent": getUserAgent() },
      },
    });
    setConfig(newConfig); // 即時更新
    return newConfig;
  };

  // Pipeline(Websocket)  https://vrchat.community/websocket
  const configurePipeline = (authToken: string) => {
    authTokenRef.current = authToken;
    shouldReconnectRef.current = true;
    createSocket();
    console.log(
      "Configure VRChatContext with authToken:",
      authTokenRef.current
    );
  };

  const createSocket = () => {
    if (pipelineRef.current) {
      pipelineRef.current.close();
      pipelineRef.current = null;
    }
    const pipeUrl = BASE_PIPELINE_URL + "?authToken=" + authTokenRef.current;
    // @ts-ignore ignore for options param
    pipelineRef.current = new WebSocket(pipeUrl, undefined, {
      headers: { "User-Agent": getUserAgent() },
    });

    pipelineRef.current.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as PipelineRawMessage;
        if (raw.type == lastJsonMessage?.type && event.timeStamp == lastJsonMessage?.timestamp) {
          console.log("Duplicate message, ignoring:", raw.type, event.timeStamp);
          return;
        }
        const parsed: PipelineMessage = {
          timestamp: event.timeStamp,
          type: raw.type,
          content: raw.content ? JSON.parse(raw.content) : null,
        };
        setLastJsonMessage(parsed);
      } catch (e) {
        console.log("Failed to parse pipeline message:", event.data);
      }
    };
    pipelineRef.current.onopen = () => {
      console.log("Pipeline connected");
      reconnectAttemptsRef.current = 0;
    };
    pipelineRef.current.onclose = (event) => {
      console.log("Pipeline closed:", event.reason);
    };
    pipelineRef.current.onerror = (error) => {
      console.log("Pipeline error:", error);
      // try reconnect
      if (
        shouldReconnectRef.current &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        const timeout = Math.pow(2, reconnectAttemptsRef.current) * 1000; // exponential backoff
        console.log(`Reconnecting in ${timeout / 1000} seconds...`);
        setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          createSocket();
        }, timeout);
      } else {
        console.log("Max reconnect attempts reached. Giving up.");
      }
    };
  };

  const unConfigure = () => {
    console.log("Unconfigure VRChatContext");
    setConfig(undefined);
    authTokenRef.current = null;
    if (pipelineRef.current) {
      pipelineRef.current.close();
      pipelineRef.current = null;
    }
  };


  const _axios = axios.create({
    withCredentials: true, // クッキーを送受信するために重要
  });

  return (
    <Context.Provider
      value={{
        config,
        configureAPI,
        configurePipeline,
        unConfigure,
        // https apis
        authenticationApi: new AuthenticationApi(config, BASE_API_URL, _axios),
        worldsApi: new WorldsApi(config, BASE_API_URL, _axios),
        avatarsApi: new AvatarsApi(config, BASE_API_URL, _axios),
        usersApi: new UsersApi(config, BASE_API_URL, _axios),
        calendarApi: new CalendarApi(config, BASE_API_URL, _axios),
        favoritesApi: new FavoritesApi(config, BASE_API_URL, _axios),
        friendsApi: new FriendsApi(config, BASE_API_URL, _axios),
        groupsApi: new GroupsApi(config, BASE_API_URL, _axios),
        instancesApi: new InstancesApi(config, BASE_API_URL, _axios),
        inviteApi: new InviteApi(config, BASE_API_URL, _axios),
        printsApi: new PrintsApi(config, BASE_API_URL, _axios),
        notificationsApi: new NotificationsApi(config, BASE_API_URL, _axios),
        // pipeline
        pipeline: {
          client: pipelineRef.current,
          lastMessage: lastJsonMessage,
          sendMessage: undefined, // not implemented for vrcapi
        },
      }}
    >
      {children}
    </Context.Provider>
  );
};

export { useVRChat, VRChatProvider };
