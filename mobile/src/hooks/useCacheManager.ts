// src/hooks/useCacheManager.ts
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { TANSTACK_STORAGE_KEY } from "@/lib/queryClient";

export interface CacheStats {
  size: number; // bytes
  count: number; // items/rows
}

export const useCacheManager = () => {
  const queryClient = useQueryClient();

  const [stateStats, setStateStats] = useState<CacheStats>();
  const [imageStats, setImageStats] = useState<CacheStats>();

  // ==========================================
  // 1. State Cache (TanStack Memory + KV-Store)
  // ==========================================
  const measureStateCache = useCallback(async () => {
    const queries = queryClient.getQueryCache().findAll({ queryKey: ["vrc"] });
    const stored = await StorageWrapper.getItemAsync(TANSTACK_STORAGE_KEY);
    const sizeBytes = stored ? new Blob([stored]).size : -1;

    setStateStats({ size: sizeBytes, count: queries.length });
  }, [queryClient]);

  const clearStateCache = useCallback(async () => {
    queryClient.removeQueries({ queryKey: ["vrc"] });
    await StorageWrapper.removeItemAsync(TANSTACK_STORAGE_KEY);
    await measureStateCache();
  }, [measureStateCache, queryClient]);

  // ==========================================
  // 3. Image Cache (expo-image)
  // ==========================================
  const measureImageCache = useCallback(async () => {
    // expo-image はJS側から同期的に正確なサイズを取得できないためダミー値
    setImageStats({ size: 0, count: 0 });
  }, []);

  const clearImageCache = useCallback(async () => {
    await Image.clearDiskCache();
    await Image.clearMemoryCache();
    await measureImageCache();
  }, [measureImageCache]);

  const clearAllCaches = useCallback(
    async () => Promise.all([clearStateCache(), clearImageCache()]),
    [clearStateCache, clearImageCache],
  );

  return {
    stateStats,
    measureStateCache,
    clearStateCache,
    imageStats,
    measureImageCache,
    clearImageCache,
    clearAllCaches,
  };
};
