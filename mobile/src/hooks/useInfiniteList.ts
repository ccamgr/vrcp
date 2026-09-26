import {
  type QueryKey,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

// Manages paginated lists, including deduplication, refresh, and error reporting.

export interface InfiniteListPageRequest {
  offset: number;
  pageSize: number;
}

interface UseInfiniteListOptions<T extends { id?: string }> {
  queryKey: QueryKey;
  enabled: boolean;
  pageSize: number;
  fetchPage: (request: InfiniteListPageRequest) => Promise<T[]>;
  onError?: (error: unknown) => void;
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: boolean | "always";
  persist?: boolean;
}

export function useInfiniteList<T extends { id?: string }>({
  queryKey,
  enabled,
  pageSize,
  fetchPage,
  onError,
  staleTime = 0,
  gcTime = 0,
  refetchOnMount = "always",
  persist = false,
}: UseInfiniteListOptions<T>) {
  const queryClient = useQueryClient();
  const reportedError = useRef<unknown>(undefined);

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPage({ offset: pageParam, pageSize }),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < pageSize ? undefined : lastPageParam + pageSize,
    enabled,
    staleTime,
    gcTime,
    refetchOnMount,
    meta: { persist },
  });

  useEffect(() => {
    if (!query.error || query.error === reportedError.current) return;
    reportedError.current = query.error;
    onError?.(query.error);
  }, [onError, query.error]);

  const items = useMemo(() => {
    const ids = new Set<string>();
    return (query.data?.pages.flat() ?? []).filter((item) => {
      if (!item.id || ids.has(item.id)) return !item.id;
      ids.add(item.id);
      return true;
    });
  }, [query.data]);

  const fetchNextPage = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  const refresh = useCallback(() => {
    return queryClient.resetQueries({ queryKey, exact: true });
  }, [queryClient, queryKey]);

  return {
    ...query,
    items,
    fetchNextPage,
    refresh,
    isRefreshing:
      query.isLoading || (query.isRefetching && !query.isFetchingNextPage),
  };
}
