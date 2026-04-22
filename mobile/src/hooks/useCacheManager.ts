// src/hooks/useCacheManager.ts
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { dbManager, dbPath } from "@/db";
import FileWrapper from "@/lib/wrappers/fileWrapper";
import StorageWrapper from "@/lib/wrappers/storageWrapper";

export interface CacheStats {
  size: number;  // bytes
  count: number; // items/rows
}

export const useCacheManager = () => {
  const queryClient = useQueryClient();

  const [stateStats, setStateStats] = useState<CacheStats>();
  const [dbStats, setDbStats] = useState<CacheStats>();
  const [imageStats, setImageStats] = useState<CacheStats>();

  // ==========================================
  // 1. State Cache (TanStack Memory + KV-Store)
  // ==========================================
  const measureStateCache = useCallback(async () => {
    const queries = queryClient.getQueryCache().findAll({ queryKey: ["vrc", "state"] });
    const stored = await StorageWrapper.getItemAsync("VRC_APP_STATE_CACHE");
    const sizeBytes = stored ? new Blob([stored]).size : 0;

    setStateStats({ size: sizeBytes, count: queries.length });
  }, [queryClient]);

  const clearStateCache = useCallback(async () => {
    queryClient.removeQueries({ queryKey: ["vrc", "state"] });
    await StorageWrapper.removeItemAsync("VRC_APP_STATE_CACHE");
    await measureStateCache();
  }, [measureStateCache, queryClient]);

  // ==========================================
  // 2. DB Cache (TanStack Memory + SQLite)
  // ==========================================
  const measureDbCache = useCallback(async () => {
    // db/index.ts の cacheManager を使って行数を取得
    const stats = await dbManager.getDBStats();

    // SQLite ファイル (vrcp.db) の物理サイズを取得
    const fileInfo = await FileWrapper.getInfoAsync(dbPath);
    const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

    setDbStats({ size: sizeBytes, count: stats.rows });
  }, []);

  const clearDbCache = useCallback(async () => {
    // メモリ上の クエリキャッシュをクリア
    queryClient.removeQueries({ queryKey: ["vrc", "db"] });

    await dbManager.clearAll();

    await measureDbCache();
  }, [measureDbCache, queryClient]);

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

  return {
    stateStats, measureStateCache, clearStateCache,
    dbStats, measureDbCache, clearDbCache,
    imageStats, measureImageCache, clearImageCache,
  };
};
