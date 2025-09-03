// タブ切り替え時等に毎回取得しないように保存しておくContext

import { CurrentUser } from "@/api/vrchat";
import { AxiosResponse } from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "./AuthContext";
import useVRChat from "./VRChatContext";


// StoredData for list Data
interface StoredData<T> {
  data: T | undefined; // undefined means not fetched yet
  refetch: () => void; // fetch from api and set new value
  set: (data: T) => void; // set value manually
  clear: () => void; // clear stored value
  _state: [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>]
  _interval: React.RefObject<number | undefined>
};

function createStoredData<
  T, 
  R extends AxiosResponse<T> = AxiosResponse<T>, 
>(
  fetch: () => Promise<R>,
  autoRefetchInterval: number = 0, // auto refetch trigger per this time [sec]
  intervalOffset: number = 0 // autorefech offset from triggered [sec]
): StoredData<T> {
  const state = useState<T>();
  const interval = useRef<number | undefined>(undefined);
  const refetch = async () => {
    console.log(fetch)
    try {
      const res  = await fetch();
      state[1](res.data);
      return res.data;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
  useEffect(() => {
    if (autoRefetchInterval > 0 ) {
      interval.current = setInterval(() => {
        setTimeout(refetch, intervalOffset * 1000);
      }, autoRefetchInterval * 1000);
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
    }
  }, [])

  const storedData: StoredData<T> = {
    data: state[0],
    refetch: refetch,
    set: (data) => state[1](data),
    clear: () => state[1](undefined),
    _state: state,
    _interval: interval
  };
  return storedData;
}


// CachedData for detailed Data (ex getWorldById)
interface CachedData<T> {
  get: (id: string) => T | undefined; // get cached value by id with statefull
  request: (id: string) => Promise<{ res: boolean, status:"waiting" | "fetching" | "exist" | "overflow"} >; // request fetch from api and set new value
  clear: () => void; // clear stored value
  _state: React.RefObject<Map<string, T>>
  _fetchs: React.RefObject<string[]>; // fetching queue by id
  _queue: React.RefObject<string[]>; // waiting for add to queue
  _maxfetchs: number
};

function createCachedData<
  T, 
  R extends AxiosResponse<T> = AxiosResponse<T>, 
> (
  fetch: (id: string) => Promise<R>, 
  maxFetchs: number = 5, // max fetching num concurrently 
  maxWaits: number = 45 // max waiting num for fetch
) : CachedData<T> {
  const state = useRef<Map<string, T>>(new Map());
  const queue = useRef<string[]>([]);
  const fetchs = useRef<string[]>([]); // fetching queue by id
  useEffect(() => {
    if (queue.current.length > 0) {
      const id = queue.current[0];
      fetch(id)
      .then((res: any) => {
        state.current.set(id, res.data);
      })
      .catch(console.error)
      .finally(() => {
        queue.current.shift();
      });
    }
  }, [queue.current.length]);

  const cachedData: CachedData<T> = {
    get: (id) => {
      const item = useMemo<T | undefined>(() => state.current.get(id), [state.current.size]);
      return item;
    },
    request: async (id) => {
      if (state.current.has(id)) return { res: false, status: "exist" };
      if (fetchs.current.includes(id)) return { res: false, status: "fetching" };
      if (queue.current.length < maxFetchs) {
        fetchs.current.push(id);
        return { res: true, status: "fetching" };
      }
      if (queue.current.includes(id)) return { res: false, status: "waiting" };
      if (queue.current.length < maxWaits) {
        queue.current.push(id);
        return { res: true, status: "waiting" };
      }
      return { res: false, status: "overflow" };
    },
    clear: state.current.clear,
    _state: state,
    _fetchs: fetchs,
    _queue: queue,
    _maxfetchs: maxFetchs,
  };
  return cachedData;
}

interface StoredDataContextType {
  // // stored data (auto-refleshed)
  currentUser: StoredData<CurrentUser>;

  // // cached data
  // worlds: CachedData<World>; 
};


const StoredDataContext = createContext<StoredDataContextType | undefined>(undefined);

const useStoredData = () => {
  const context = useContext(StoredDataContext);
  if (!context) {
    throw new Error("useStoredData must be used within a StoredDataProvider");
  }
  return context;
};

const StoredDataProvider : React.FC<{children?: React.ReactNode}> = ({children}) => {
  const auth = useAuth();
  const vrc = useVRChat();


  return (
    <StoredDataContext.Provider value={{
      currentUser: createStoredData(useCallback(() => vrc.authenticationApi.getCurrentUser(), [auth.user]), 10),
      // worlds: createCachedData(vrc.worldsApi.getWorld, 5, 45),
    }}>
      {children}
    </StoredDataContext.Provider>
  );
}

export default useStoredData;
export { StoredDataProvider };

