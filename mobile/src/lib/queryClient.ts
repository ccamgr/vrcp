import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import AsyncStorage from "expo-sqlite/kv-store";

export const TANSTACK_STORAGE_KEY = "TANSTACK_STATE_CACHE";

// 1. 公式 Persister が期待するインターフェースに合わせるための Shim
const storageShim = {
  getItem: (key: string) => AsyncStorage.getItemAsync(key),
  setItem: (key: string, value: string) => AsyncStorage.setItemAsync(key, value),
  removeItem: (key: string) => { AsyncStorage.removeItemAsync(key); },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
});

// 2. 公式のファクトリ関数を使用して Persister を作成
export const persister = createAsyncStoragePersister({
  storage: storageShim,
  key: TANSTACK_STORAGE_KEY,
  throttleTime: 1000,
});

export const persistOptions: PersistQueryClientProviderProps["persistOptions"] = {
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const [key0, key1] = query.queryKey as string[];
      return key0 === "vrc" && key1 === "state";
    },
  },
};
