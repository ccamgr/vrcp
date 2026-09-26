import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import AsyncStorage from "expo-sqlite/kv-store";

type ListQK = "avatars" | "worlds" | "users" | "groups";
type ListSearchQK = "search-avatars" | "search-worlds" | "search-users" | "search-groups";

export const TANSTACK_STORAGE_KEY = "TANSTACK_STATE_CACHE";
export const TANSTACK_CACHE_BUSTER = "vrc-account-query-cache-v2";

export const vrcQueryKeys = {
  currentUser: (accountId: string) =>
    ["vrc", accountId, "currentUser"] as const,
  publicProfile: (accountId: string, userId: string, asSelf: boolean) =>
    ["vrc", accountId, "publicProfile", userId, asSelf] as const,
  user: (accountId: string, userId: string) =>
    ["vrc", accountId, "user", userId] as const,
  world: (accountId: string, worldId: string) =>
    ["vrc", accountId, "world", worldId] as const,
  avatar: (accountId: string, avatarId: string) =>
    ["vrc", accountId, "avatar", avatarId] as const,
  group: (accountId: string, groupId: string) =>
    ["vrc", accountId, "group", groupId] as const,
  friends: (accountId: string) => ["vrc", accountId, "friends"] as const,
  favorites: (accountId: string) => ["vrc", accountId, "favorites"] as const,
  favoriteGroups: (accountId: string) =>
    ["vrc", accountId, "favoriteGroups"] as const,
  favoriteLimits: (accountId: string) =>
    ["vrc", accountId, "favoriteLimits"] as const,
  favAvatars: (accountId: string) => ["vrc", accountId, "favAvatars"] as const,
  favWorlds: (accountId: string) => ["vrc", accountId, "favWorlds"] as const,
  favFriends: (accountId: string) => ["vrc", accountId, "favFriends"] as const,
  notifications: (accountId: string) =>
    ["vrc", accountId, "notifications"] as const,
  mutualFriends: (accountId: string, userId: string) =>
    ["vrc", accountId, "mutual-friends", userId] as const,
  mutualGroups: (accountId: string, userId: string) =>
    ["vrc", accountId, "mutual-groups", userId] as const,
  list: (accountId: string, kind: ListQK | ListSearchQK, id: string) => // 一覧ページ用, 各ページの中で直接利用
    ["vrc", accountId, kind, id] as const,
};

// 1. 公式 Persister が期待するインターフェースに合わせるための Shim
const storageShim = {
  getItem: (key: string) => AsyncStorage.getItemAsync(key),
  setItem: (key: string, value: string) =>
    AsyncStorage.setItemAsync(key, value),
  removeItem: (key: string) => AsyncStorage.removeItemAsync(key).then(() => {}),
};

const describeQueryError = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const value = error as {
    code?: unknown;
    message?: unknown;
    response?: { status?: unknown };
  };
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    message:
      typeof value.message === "string" ? value.message : String(error),
    status:
      typeof value.response?.status === "number"
        ? value.response.status
        : undefined,
  };
};

const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error("TanStack Query request failed", {
      error: describeQueryError(error),
      queryKey: query.queryKey,
    });
  },
});

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: storageShim,
  key: TANSTACK_STORAGE_KEY,
  throttleTime: 1000,
});

export const clearAccountQueries = async () => {
  await queryClient.cancelQueries({ queryKey: ["vrc"] });
  queryClient.removeQueries({ queryKey: ["vrc"] });
  await persister.removeClient();
};

export const persistOptions: PersistQueryClientProviderProps["persistOptions"] =
  {
    persister,
    buster: TANSTACK_CACHE_BUSTER,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.meta?.persist === true && query.state.status === "success",
    },
  };
