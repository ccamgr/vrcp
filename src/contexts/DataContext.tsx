import {
  Avatar,
  CurrentUser,
  Favorite,
  FavoritedWorld,
  FavoriteGroup,
  LimitedUserFriend,
  LimitedWorld,
} from "@/vrchat/api";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useVRChat } from "./VRChatContext";
import { PipelineContent, PipelineType } from "@/vrchat/pipline/type";
import { convertUserToLimitedUserFriend } from "@/lib/vrchatUtils";
import { useCache } from "./CacheContext";

// Store VRCAPI Data Globally

interface DataWrapper<T> {
  data: T;
  isLoading: boolean;
  fetch: () => Promise<T>; // fetch and update data
  set: (v: React.SetStateAction<T>) => void; // manually set data
  clear: () => void;
  _order: number; // lower number means execute earlier
}

interface DataContextType {
  fetchAll: () => Promise<void>;
  clearAll: () => Promise<void>;

  currentUser: DataWrapper<CurrentUser | undefined>;

  friends: DataWrapper<LimitedUserFriend[]>; // all friends
  worlds: DataWrapper<FavoritedWorld[]>; // favorited worlds
  avatars: DataWrapper<Avatar[]>; // favorited avatars

  favoriteGroups: DataWrapper<FavoriteGroup[]>;
  favorites: DataWrapper<Favorite[]>; // almost for favorited friends
}

const Context = createContext<DataContextType | undefined>(undefined);

const useData = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

const DataProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const cache = useCache();

  /** APIs */
  // data getters
  const getCurrentUser = async () => cache.currentUser.get(true); // fetch and set cache current user
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
      values.currentUser.data ?? (await cache.currentUser.get()); // use cache without force fetch
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
  const getWorlds = async () => {
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
  const getAvatars = async () => {
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
  const values = {
    currentUser: initDataWrapper<CurrentUser | undefined>(
      undefined,
      getCurrentUser
    ),
    friends: initDataWrapper<LimitedUserFriend[]>([], getFriends),
    favoriteGroups: initDataWrapper<FavoriteGroup[]>([], getFavoriteGroups),
    favorites: initDataWrapper<Favorite[]>([], getFavorites),
    worlds: initDataWrapper<FavoritedWorld[]>([], getWorlds),
    avatars: initDataWrapper<Avatar[]>([], getAvatars),
  };

  // fetch all data in order
  const fetchAll = async () => {
    await Promise.all(Object.values(values).map((v) => v.fetch()));
  };
  const clearAll = async () => {
    await Promise.all(Object.values(values).map((v) => v.clear()));
  };

  useEffect(() => {
    if (auth.user) {
      fetchAll().catch(console.error);
    } else {
      clearAll(); // clear data on logout
    }
  }, [auth.user]);

  /** Pipelines */
  // Apply pipeline messages to update states
  const applyPipeMsgToStates = <T extends PipelineType>(
    type: T,
    content: PipelineContent<T>
  ) => {
    // about friends only for now
    if (
      (
        [
          "friend-update",
          "friend-location",
          "friend-online",
          "friend-active",
        ] as PipelineType[]
      ).includes(type)
    ) {
      const data = content as PipelineContent<
        "friend-update" | "friend-location" | "friend-online" | "friend-active"
      >;
      if (values.friends.data.find((f) => f.id === data.userId) != undefined) {
        values.friends.set((prev) =>
          prev.map((f) => (f.id === data.userId ? { ...f, ...data.user } : f))
        );
      } else {
        values.friends.set((prev) => [
          ...prev,
          convertUserToLimitedUserFriend(data.user),
        ]);
      }
    } else if (type == "friend-offline") {
      const data = content as PipelineContent<"friend-offline">;
      values.friends.set((prev) =>
        prev.map((f) =>
          f.id === data.userId ? { ...f, location: "offline" } : f
        )
      );
    } else if (type == "friend-add") {
      const data = content as PipelineContent<"friend-add">;
      values.friends.set((prev) => [
        ...prev,
        convertUserToLimitedUserFriend(data.user),
      ]);
    } else if (type == "friend-delete") {
      const data = content as PipelineContent<"friend-delete">;
      values.friends.set((prev) => prev.filter((f) => f.id !== data.userId));
    } else {
      console.log("Pipeline type:", type);
    }
  };

  useEffect(() => {
    const msg = vrc.pipeline?.lastMessage;
    if (!msg) return;
    if (PipelineType.includes(msg.type as any)) {
      applyPipeMsgToStates(msg.type, msg.content as any);
    } else {
      console.log("Pipeline unknown message:", msg.type);
    }
  }, [vrc.pipeline?.lastMessage]);

  return (
    <Context.Provider
      value={{
        fetchAll,
        clearAll,
        ...values,
      }}
    >
      {children}
    </Context.Provider>
  );
};

function initDataWrapper<T>(
  initialData: T,
  getter?: () => Promise<T>,
  order?: number
): DataWrapper<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fetch = async () => {
    if (!getter) return data; // no getter, just return current data
    setIsLoading(true);
    try {
      const newData = await getter();
      setData(newData);
      setIsLoading(false);
      return newData;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };
  const set = (v: React.SetStateAction<T>) => setData(v);
  const clear = () => setData(initialData);
  return { data, fetch, set, clear, isLoading, _order: order ?? 0 };
}

export { DataProvider, useData };
