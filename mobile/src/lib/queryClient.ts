import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

const clientStorage = {
  setItem: (key: string, value: string) => storage.set(key, value),
  getItem: (key: string) => storage.getString(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 24 hours
      staleTime: 1000 * 60 * 60 * 24,
      // 7 days
      gcTime: 1000 * 60 * 60 * 24 * 7,
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: clientStorage,
});

// Persistence logic
export const persistOptions = {
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      const [namespace, type] = query.queryKey as string[];
      // Only persist queries that match ["vrc", "state", ...]
      return namespace === "vrc" && type === "state";
    },
  },
};
