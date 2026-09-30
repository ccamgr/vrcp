import { useCallback, useState } from "react";

const getRefreshError = (result: unknown): unknown => {
  if (typeof result !== "object" || result === null || !("error" in result)) {
    return undefined;
  }

  return result.error;
};

export const usePullToRefresh = (
  refresh: () => Promise<unknown>,
  onError?: (error: unknown) => void,
) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const result = await refresh();
      const error = getRefreshError(result);
      if (error) onError?.(error);
    } catch (error) {
      onError?.(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onError, refresh]);

  return { isRefreshing, onRefresh };
};
