import {
  Avatar,
  CurrentUser,
  Favorite,
  FavoritedWorld,
  FavoriteGroup,
  FavoriteLimits,
  LimitedUserFriend,
  LimitedWorld,
} from "@/vrchat/api";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { useAuth } from "./AuthContext";
import { useVRChat } from "./VRChatContext";
import { PipelineContent, PipelineMessage, PipelineType } from "@/vrchat/pipline/type";
import { convertToLimitedUserFriend } from "@/libs/vrchat";
import { useCache } from "./CacheContext";
import { useSetting } from "./SettingContext";
import Storage from "expo-sqlite/kv-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";


// Store VRCAPI Data Globally


interface DataWrapper<T> {
  data: T;
  isLoading: boolean;
  fetch: () => Promise<T>; // fetch and update data
  set: (v: React.SetStateAction<T>) => void; // manually set data
  clear: () => void;
}

interface DataContextType {
  // fetchAll: () => Promise<void>;
  // clearAll: () => Promise<void>;

  currentUser: DataWrapper<CurrentUser | undefined>;
  friends: DataWrapper<LimitedUserFriend[]>; // all friends
  favWorlds: DataWrapper<FavoritedWorld[]>; // favorited worlds
  favAvatars: DataWrapper<Avatar[]>; // favorited avatars
  favoriteGroups: DataWrapper<FavoriteGroup[]>;
  favorites: DataWrapper<Favorite[]>; // almost for favorited friends

  pipelineMessages: PipelineMessage[]; // store pipeline messages
}

const Context = createContext<DataContextType | undefined>(undefined);

const useData = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};

const DataProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { settings } = useSetting();
  const queryClient = useQueryClient();
  const vrc = useVRChat();
  const auth = useAuth();
  const cache = useCache();
  const [pipelineMessages, setPipelineMessages] = useState<PipelineMessage[]>([]); // store pipeline messages


  /** APIs */
  // data getters
  const getCurrentUser = async () => await cache.currentUser.get(); // fetch and set cache current user
  const getFavoriteGroups = async () =>
    (await vrc.favoritesApi.getFavoriteGroups()).data;
  const getFavorites = async () => {
    const npr = 100; // number per request max 100
    const limits = await cache.favoriteLimits.get();
    const avt =
      limits.maxFavoriteGroups.avatar * limits.maxFavoritesPerGroup.avatar;
    const fri =
      limits.maxFavoriteGroups.friend * limits.maxFavoritesPerGroup.friend;
    const wld =
      limits.maxFavoriteGroups.world * limits.maxFavoritesPerGroup.world;
    const nReq = Math.ceil((avt + fri + wld) / npr);
    const res = await Promise.all([
      ...Array.from({ length: nReq }, (_, i) =>
        vrc.favoritesApi.getFavorites({
          offset: i * npr,
          n: npr,
          type: undefined,
        })
      ), // online or active
    ]);
    return res.flatMap((r) => r.data);
  };
  const getFriends = async () => {
    const npr = 100; // number per request max 100
    let nReqOnline = 2,
      nReqOffline = 2;
    const cuser: CurrentUser =
      wrappers.currentUser.data ?? (await cache.currentUser.get()); // use cache without force fetch
    if (cuser) {
      const all = cuser.friends?.length ?? 0;
      const off = cuser.offlineFriends?.length ?? 0;
      nReqOnline = Math.ceil((all - off) / npr);
      nReqOffline = Math.ceil(off / npr);
    }
    const res = await Promise.all([
      ...Array.from({ length: nReqOnline }, (_, i) =>
        vrc.friendsApi.getFriends({ offset: i * npr, n: npr, offline: false })
      ), // online or active
      ...Array.from({ length: nReqOffline }, (_, i) =>
        vrc.friendsApi.getFriends({ offset: i * npr, n: npr, offline: true })
      ), // offline
    ]);
    return res.flatMap((r) => r.data);
  };
  const getFavWorlds = async () => {
    const npr = 100;
    const limits = await cache.favoriteLimits.get();
    const wld =
      limits.maxFavoriteGroups.world * limits.maxFavoritesPerGroup.world;
    const nReq = Math.ceil(wld / npr);
    const res = await Promise.all([
      ...Array.from({ length: nReq }, (_, i) =>
        vrc.worldsApi.getFavoritedWorlds({ offset: i * npr, n: npr })
      ),
    ]);
    return res.flatMap((r) => r.data);
  };
  const getFavAvatars = async () => {
    const npr = 100;
    const limits = await cache.favoriteLimits.get();
    const avt =
      limits.maxFavoriteGroups.avatar * limits.maxFavoritesPerGroup.avatar;
    const nReq = Math.ceil(avt / npr);
    const res = await Promise.all([
      ...Array.from({ length: nReq }, (_, i) =>
        vrc.avatarsApi.getFavoritedAvatars({ offset: i * npr, n: npr })
      ),
    ]);
    return res.flatMap((r) => r.data);
  };


  // register data wrappers
  const wrappers = {
    currentUser: useDataWrapper<CurrentUser | undefined>("currentUser", getCurrentUser, undefined, !!auth.user),
    friends: useDataWrapper<LimitedUserFriend[]>("friends", getFriends , [], !!auth.user),
    favoriteGroups: useDataWrapper<FavoriteGroup[]>("favoriteGroups", getFavoriteGroups, [], !!auth.user),
    favorites: useDataWrapper<Favorite[]>("favorites", getFavorites, [], !!auth.user),
    favWorlds: useDataWrapper<FavoritedWorld[]>("favWorlds", getFavWorlds, [], !!auth.user),
    favAvatars: useDataWrapper<Avatar[]>("favAvatars", getFavAvatars, [], !!auth.user),
  };

  useEffect(() => {
    if (auth.user) {
      Object.values(wrappers).forEach((w) => w.fetch().catch(console.error));
    } else {
      queryClient.removeQueries({
        queryKey: ["dataContext"],
        exact: false,
      });
    }
  }, [auth.user]);

  /** Pipelines */
  
  useEffect(() => {
    const msg = vrc.pipeline?.lastMessage;
    const prevMsg = pipelineMessages.length > 0 ? pipelineMessages[0] : null;
    if (!msg) return;
    if (msg.timestamp === prevMsg?.timestamp && msg.type === prevMsg?.type) {
      return; // already have this message
    }
    if (PipelineType.includes(msg.type as any)) {
      applyPipeMsgToStates(msg.type, msg.content as any);
      storeLastPipelineMessages(msg);
    } else {
      console.log("Pipeline unknown message:", msg.type);
    }
  }, [vrc.pipeline?.lastMessage]);

  // restore past pipeline messages from storage
  useEffect(() => {
    Storage.getItem("data_lastPipeMsgs")
    .then((v) => {
      if (v) {
        const msgs = JSON.parse(v) as PipelineMessage[];
        setPipelineMessages(msgs);
      }
    })
    .catch(console.error);
  }, []);

  // Store past pipeline messages
  const storeLastPipelineMessages = async (msg: PipelineMessage) => {
    const newMsgs = [msg, ...pipelineMessages].slice(0, settings.pipelineOptions.keepMsgNum);
    setPipelineMessages(newMsgs);
    Storage.setItem("data_lastPipeMsgs", JSON.stringify(newMsgs))
    .catch(console.error);
  };

  // Apply pipeline messages to update states
  const applyPipeMsgToStates = <T extends PipelineType>(
    type: T,
    content: PipelineContent<T>
  ) => {
    // about friends only for now
    switch (type) {
      case "friend-update":
      case "friend-location":
      case "friend-online":
      case "friend-active":
        const dataF = content as PipelineContent<
          "friend-update" | "friend-location" | "friend-online" | "friend-active"
        >;
        const location = type === "friend-location" ? (dataF as any).location as string : dataF.user.location ?? "offline";
        if (wrappers.friends.data.find((f) => f.id === dataF.userId) != undefined) {
          wrappers.friends.set((prev) =>
            prev.map((f) => (f.id === dataF.userId ? { ...f, ...dataF.user, location } : f))
          );
        } else {
          wrappers.friends.set((prev) => [
            ...prev,
            convertToLimitedUserFriend(dataF.user),
          ]);
        }
        break;
      case "friend-offline":
        const dataFof = content as PipelineContent<"friend-offline">;
        wrappers.friends.set((prev) =>
          prev.map((f) =>
            f.id === dataFof.userId ? { ...f, location: "offline" } : f
          )
        );
        break;
      case "friend-add":
        const dataFad = content as PipelineContent<"friend-add">;
        wrappers.friends.set((prev) => [
          ...prev,
          convertToLimitedUserFriend(dataFad.user),
        ]);
        break;
      case "friend-delete":
        const dataFdel = content as PipelineContent<"friend-delete">;
        wrappers.friends.set((prev) => prev.filter((f) => f.id !== dataFdel.userId));
        break;
      default:
    }
  };

  return (
    <Context.Provider
      value={{
        // fetchAll,
        // clearAll,
        ...wrappers,
        pipelineMessages
      }}
    >
      {children}
    </Context.Provider>
  );
};


function useDataWrapper<T>(
  key: string,
  queryFn: () => Promise<T>,
  initialData: T,
  enabled: boolean = true,
  expiration: number = 1000 * 60 * 10 // default 10 minutes
): DataWrapper<T> {
  const queryClient = useQueryClient();
  const queryKey = ["dataContext", key];

  const { data, isFetching, refetch } = useQuery<T>({
    queryKey,
    queryFn,
    initialData,
    staleTime: expiration,
    enabled,
    refetchOnReconnect: true,
  });

  const set = (v: React.SetStateAction<T>) => {
    queryClient.setQueryData(queryKey, (prev: T | undefined) => {
      if (typeof v === "function") return (v as (prevState: T) => T)(prev ?? initialData);
      return v;
    });
  };

  const clear = () => queryClient.removeQueries({ queryKey });

  return {
    data: data ?? initialData,
    isLoading: isFetching,
    fetch: async () => (await refetch()).data ?? initialData,
    set,
    clear,
  };
}

export { DataProvider, useData };
