import { getUserAgent, omitObject } from "@/libs/utils";
import {
  Avatar,
  CurrentUser,
  FavoriteLimits,
  Group,
  User,
  World,
} from "@/generated/vrcapi";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Platform } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useVRChat } from "./VRChatContext";
import FileWrapper from "@/libs/wrappers/fileWrapper";

// Image Cache in Storage
interface Cache<T> {
  expiredAt: string; // ISO formated date, if empty-string, never expire
  value: T;
}

type CacheMode = "byId" | "single"; // list: get-list & cache-list, id: get-byId & cache-list, single: get-single & cache-single

interface CacheOption {
  expiration: number; // in milliseconds
  encrypt: boolean;
  type: "json" | "raw";
}

type CacheGetterFunc<T, M extends CacheMode = "byId"> = M extends "single"
  ? () => Promise<T>
  : (id: string) => Promise<T>;

type CacheWrapper<T, M extends CacheMode = "byId"> = M extends "single" ? {
  get: (forceFetch?: boolean) => Promise<T>;
  set: (data: T) => Promise<void>;
  del: () => Promise<void>;
} : {
  get: (id: string, forceFetch?: boolean) => Promise<T>;
  set: (id: string, data: T) => Promise<void>;
  del: (id: string) => Promise<void>;
}

interface CacheContextType {
  clearCache: () => Promise<void>;
  getCacheInfo: () => Promise<{ size: number; count: number }>;
  //
  currentUser: CacheWrapper<CurrentUser, "single">;
  favoriteLimits: CacheWrapper<FavoriteLimits, "single">;
  // by id (list-data)
  user: CacheWrapper<User, "byId">;
  world: CacheWrapper<World, "byId">;
  group: CacheWrapper<Group, "byId">;
  avatar: CacheWrapper<Avatar, "byId">;
}

const isNative = Platform.OS !== "web";

const Context = createContext<CacheContextType | undefined>(undefined);

// root-directory for cache, only-use on native
const cacheRootDir = isNative ? `${FileSystem.cacheDirectory}` : "cache";

// get local file uri from key (id or url), subDirName must end with /
const getLocalUri = async (
  key: string,
  subDirName: string,
  encryptKey?: boolean
) => {
  if (encryptKey) {
    const cryptKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key
    );
    return cacheRootDir + subDirName + cryptKey;
  }
  return cacheRootDir + subDirName + key;
};


// [ToDo] use Tanstack Query for better data management?

const useCache = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useCache must be used within a CacheProvider");
  return context;
};
const CacheProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const initTrigger = useRef(0);
  const vrc = useVRChat();

  // create cache dir if not exist
  useEffect(() => {
    FileWrapper.getInfoAsync(cacheRootDir)
      .then((dirInfo) => {
        if (!dirInfo.exists)
          FileWrapper.makeDirectoryAsync(cacheRootDir);
      })
      .catch((error) => {
        console.error("Error creating cache directory:", error);
      });
  }, []);

  /// Cache Getters
  const getCurrentUser = async () =>
    (await vrc.authenticationApi.getCurrentUser()).data;
  const getFavoriteLimits = async () =>
    (await vrc.favoritesApi.getFavoriteLimits()).data;
  const getWorld = async (id: string) =>
    (await vrc.worldsApi.getWorld({ worldId: id })).data;
  const getUser = async (id: string) =>
    (await vrc.usersApi.getUser({ userId: id })).data;
  const getGroup = async (id: string) =>
    (await vrc.groupsApi.getGroup({ groupId: id })).data;
  const getAvatar = async (id: string) =>
    (await vrc.avatarsApi.getAvatar({ avatarId: id })).data;


  // // Initialize caches (called when clear cache and on mount)
  // useEffect(() => {
  //   // for images
  //   initCachedImage();
  // }, [initTrigger.current]);
  const wrappers = useMemo(
    () => ({
      // only used for DataContext, use useData(),currentUser instaead of this,
      currentUser: useCacheWrapper<CurrentUser, "single">("single", "currentUser/", getCurrentUser, { expiration: 1000 }), // expire with 1 second, basically,
      favoriteLimits: useCacheWrapper<FavoriteLimits, "single">("single", "favoriteLimits/", getFavoriteLimits, { expiration: 60 * 60 * 1000 }), // expire with 1 hour
      // by id (basiccally, use for name lookup)
      user: useCacheWrapper<User, "byId">("byId", "users/", getUser, { expiration: 1 * 24 * 60 * 60 * 1000 }), // expire with 1 day
      world: useCacheWrapper<World, "byId">("byId", "worlds/", getWorld, {expiration: 7 * 24 * 60 * 60 * 1000}), // expire with 7 days
      group: useCacheWrapper<Group, "byId">("byId", "groups/", getGroup, { expiration: 7 * 24 * 60 * 60 * 1000 }), // expire with 7 days
      avatar: useCacheWrapper<Avatar, "byId">("byId", "avatars/", getAvatar, {expiration: 7 * 24 * 60 * 60 * 1000}), // expire with 7 days
    }),
    [initTrigger.current, vrc.config]
  );

  const clearCache = async () => {
    // delete all files in cache root-dir and recreate it
    await FileWrapper.deleteAsync(cacheRootDir);
    await FileWrapper.makeDirectoryAsync(cacheRootDir);
    // re-initiate all cache wrappers (with creating sub directories)
    initTrigger.current += 1;
  };
  const getCacheInfo = async () => {
    if (isNative) {
      // recursively get total size and count of files in cache root-dir
      const countFileRecursive = async (dir: string): Promise<number> => {
        let totalCount = 0;
        const items = await FileSystem.readDirectoryAsync(dir);
        await Promise.all(items.map(async (item) => {
          const itemPath = dir + item;
          const info = await FileSystem.getInfoAsync(itemPath);
          if (info.isDirectory) {
            const subDirTotal = await countFileRecursive(itemPath + "/");
            totalCount += subDirTotal;
          } else {
            totalCount += 1;
          }
        }));
        return totalCount;
      };
      const rootInfo = await FileSystem.getInfoAsync(cacheRootDir);
      const rootSize = rootInfo.exists ? rootInfo.size || 0 : 0;
      const rootCount = rootInfo.exists
        ? await countFileRecursive(cacheRootDir)
        : 0;
      return { size: rootSize, count: rootCount };
    } else {
      // on web, get total size and count of files in indexeddb under the cacheRootDir
      return { size: 0, count: 0 };
    }
  };

  return (
    <Context.Provider
      value={{
        clearCache,
        getCacheInfo,
        ...wrappers,
      }}
    >
      {children}
    </Context.Provider>
  );
};

/** Cache Initializers */
function useCacheWrapper<T = any, M extends CacheMode = any>(
  mode: M,
  subDir: string, // sub-directory name, must end with /
  getter: CacheGetterFunc<T, M>,
  options?: Partial<CacheOption>
): CacheWrapper<T, M> {
  const opt: CacheOption = {
    expiration: options?.expiration ?? 24 * 60 * 60 * 1000, // default: 24 hours, if set to 0, never expire
    encrypt: options?.encrypt ?? false, // default: no encrypt, use raw key as filename
    type: options?.type ?? "json", // default: json
  };

  if (subDir.startsWith("/") || !subDir.endsWith("/"))
    throw new Error(
      "subDir must not start with / and must end with /: " + subDir
    );
  if (opt.type !== "json") throw new Error("not-implemented cache type: " + opt.type);

  // initiate cache sub-directory
  if (isNative) {
    FileSystem.getInfoAsync(cacheRootDir + subDir)
      .then((dirInfo) => {
        if (!dirInfo.exists)
          FileSystem.makeDirectoryAsync(cacheRootDir + subDir, {
            intermediates: true,
          });
      })
      .catch((error) => {
        console.error(
          `Error creating cache sub-dir: ${cacheRootDir + subDir}`,
          error
        );
      });
  }

  const get = async (id: string, opt: CacheOption, forceFetch: boolean = false): Promise<T> => {
    const localUri = await getLocalUri(id, subDir, opt.encrypt);
    const fileInfo = await FileWrapper.getInfoAsync(localUri);
    if (fileInfo.exists) {
      const fileContent = await FileWrapper.readAsStringAsync(localUri);
      const cache: Cache<T> = JSON.parse(fileContent);
      if (
        !forceFetch &&
        (cache.expiredAt == "" || new Date() < new Date(cache.expiredAt))
      ) {
        return cache.value;
      }
    }
    // no-cached or cached-but-expired, get and set with new data
    const data = await getter(id);
    const newCache: Cache<T> = {
      expiredAt:
        opt.expiration > 0 ? new Date(Date.now() + opt.expiration).toISOString() : "",
      value: data,
    };
    await FileWrapper.writeAsStringAsync(localUri, JSON.stringify(newCache));
    return data;
  };
  const set = async (id: string, data: T, opt: CacheOption) => {
    const localUri = await getLocalUri(id, subDir, opt.encrypt);
    const newCache: Cache<T> = {
      expiredAt:
        opt.expiration > 0 ? new Date(Date.now() + opt.expiration).toISOString() : "",
      value: data,
    };
    await FileWrapper.writeAsStringAsync(localUri, JSON.stringify(newCache));
  };
  const del = async (id: string, opt: CacheOption,) => {
    const localUri = await getLocalUri(id, subDir, opt.encrypt);
    await FileWrapper.deleteAsync(localUri);
  };

  // return based on mode
  if (mode === "single")
    return {
      get: (forceFetch: boolean = false) => get("data", opt, forceFetch),
      set: (data: T) => set("data", data, opt),
      del: () => del("data", opt),
    } as CacheWrapper<T, M>;
  else {
    return {
      get: (id: string, forceFetch: boolean = false) => get(id, opt, forceFetch),
      set: (id: string, data: T) => set(id, data, opt),
      del: (id: string) => del(id, opt),
    } as CacheWrapper<T, M>;
  }
}

// // Cached Image Component, use this instead of Default Image Component,
// // cache dir "images/" is used for this component
// const imageCacheSubDir = "images/"; // must end with /

// function initCachedImage() {
//   if (!isNative) return;
//   // create sub-directory for images
//   FileWrapper.getInfoAsync(cacheRootDir + imageCacheSubDir)
//     .then((dirInfo) => {
//       if (!dirInfo.exists)
//         FileWrapper.makeDirectoryAsync(cacheRootDir + imageCacheSubDir);
//     })
//     .catch((error) => {
//       console.error(
//         `Error creating cache sub-dir: ${cacheRootDir + imageCacheSubDir}`,
//         error
//       );
//     });
// }

// async function downloadImageToCache (remoteUri: string): Promise<string | undefined> {
//   if (!isNative) return;
//   let eBuf = "";
//   try {
//     if (!remoteUri || remoteUri.length === 0) return;
//     if (remoteUri.startsWith("file://")) return remoteUri; // local file, no need to cache
//     const localUri = await getLocalUri(remoteUri, imageCacheSubDir, true);
//     const fileInfo = await FileWrapper.getInfoAsync(localUri);
//     if (fileInfo.exists) {
//       return localUri
//     } else {
//       const { uri } = await FileWrapper.downloadAsync(remoteUri, localUri, {
//         headers: {'User-Agent': getUserAgent()},
//       });
//       return uri;
//     }
//   } catch (error) {
//     console.log("Error loading image:", remoteUri, error);
//   }
// };

// const CachedImage = ({
//   src: remoteUri,
//   localUriRef,
//   ...rest
// }: {
//   src: string;
//   localUriRef?: React.RefObject<string | null>; // to get current local-uri
//   [key: string]: any;
// }) => {
//   const [src, setSrc] = useState<string | undefined>();
//   const load = async () => {
//     if (!isNative) return;
//     const localUri = await downloadImageToCache(remoteUri);
//     if (localUri) {
//       setSrc(localUri);
//       if (localUriRef) localUriRef.current = localUri;
//     } else {
//       setSrc(remoteUri); // fallback to remote uri
//       if (localUriRef) localUriRef.current = null;
//     }
//   };
//   useEffect(() => {
//     if (!isNative) return; // no caching on web
//     if (remoteUri.length > 0) load();
//   }, [remoteUri]);

//   if (isNative) {
//     return (
//       <Image
//         source={{ uri: src }}
//         progressiveRenderingEnabled={true}
//         style={[{ resizeMode: "cover" }, rest.style]}
//         {...omitObject(rest, "style")}
//       />
//     );
//   } else {
//     // on web, use default Image component
//     return (
//       <Image
//         source={{ uri: remoteUri }}
//         style={[{ resizeMode: "cover" }, rest.style]}
//         {...omitObject(rest, "style")}
//       />
//     );
//   }
// };


/** use ExpoImage , Custom Cache is used for only EnhancedImageViewing */

const CachedImage = ({
  src: remoteUri,
  localUriRef,
  ...rest
}: {
  src: string;
  localUriRef?: React.RefObject<string | null>; // to get current local-uri
  [key: string]: any;
}) => {

  return (
    <ExpoImage
      source={{
        uri: remoteUri,
        headers: {'User-Agent': getUserAgent()},
      }}
      style={[{ contentFit: "cover" }, rest.style]}
      {...omitObject(rest, "style")}
    />
  );
};

export { CachedImage, CacheProvider, useCache };
