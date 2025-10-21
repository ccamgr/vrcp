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
import { useQueries, useQuery } from "@tanstack/react-query";


// Store VRCAPI Data Globally


// [ToDo] use Tanstack Query for better data management?
interface DataWrapper<T> {
  data: T;
  isLoading: boolean;
  fetch: () => Promise<T>; // fetch and update data
  set: (v: React.SetStateAction<T>) => void; // manually set data
  clear: () => void;
}

interface DataContextType {
  fetchAll: () => Promise<void>;
  clearAll: () => Promise<void>;

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
    currentUser: useDataWrapper<CurrentUser | undefined>(undefined, getCurrentUser),
    friends: useDataWrapper<LimitedUserFriend[]>([], getFriends),
    favoriteGroups: useDataWrapper<FavoriteGroup[]>([], getFavoriteGroups),
    favorites: useDataWrapper<Favorite[]>([], getFavorites),
    favWorlds: useDataWrapper<FavoritedWorld[]>([], getFavWorlds),
    favAvatars: useDataWrapper<Avatar[]>([], getFavAvatars),
  };
  // fetch all data in order
  const fetchAll = async () => {
    await Promise.all(Object.values(wrappers).map((v) => v.fetch()));
  };
  const clearAll = async () => {
    await Promise.all(Object.values(wrappers).map((v) => v.clear()));
  };

  useEffect(() => {
    if (auth.user) {
      fetchAll().catch(console.error);
    } else {
      clearAll(); // clear data on logout
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
        fetchAll,
        clearAll,
        ...wrappers,
        pipelineMessages
      }}
    >
      {children}
    </Context.Provider>
  );
};

function useDataWrapper<T>(
  initialData: T,
  getter?: () => Promise<T>,
): DataWrapper<T> {
  const [wrapperState, setWrapperState] = useState<{data: T, isLoading: boolean}>({data: initialData, isLoading: false});
  const fetch = async () => {
    if (!getter) return wrapperState.data; // no getter, just return current data
    if (wrapperState.isLoading) return wrapperState.data; // already loading
    setWrapperState((s) => ({...s, isLoading: true}));
    try {
      const newData = await getter();
      setWrapperState({data: newData, isLoading: false});
      return newData;
    } catch (error) {
      setWrapperState((s) => ({...s, isLoading: false}));
      throw error;
    }
  };
  const set = (v: React.SetStateAction<T>) => {
    if (typeof v === "function") {
      setWrapperState((s) => ({...s, data: (v as (prevState: T) => T)(s.data)}));
    } else {
      setWrapperState((s) => ({...s, data: v}));
    }
  };
  const clear = () => setWrapperState({data: initialData, isLoading: false});
  return { data: wrapperState.data, fetch, set, clear, isLoading: wrapperState.isLoading};
}

export { DataProvider, useData };
