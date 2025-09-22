import { CurrentUser, FavoriteGroup } from '@/vrchat/api';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useVRChat } from './VRChatContext';
import { PipelineType } from '@/vrchat/pipline/type';



// Store VRCAPI Data Globally

interface DataWrapper<T> {
  data: T;
  isLoading: boolean;
  fetch: () => Promise<T>;
  set: (data: T) => void;
  clear: () => void;
}

interface DataContextType {
  fetchAll: () => Promise<void>;
  clearAll: () => Promise<void>;

  currentUser: DataWrapper<CurrentUser | undefined>;

  // friends: DataWrapper<LimitedUserFriend[]>; // all friends
  // onlineFriends: DataWrapper<LimitedUserFriend[]>;
  // activeFriends: DataWrapper<LimitedUserFriend[]>;
  // offlineFriends: DataWrapper<LimitedUserFriend[]>;

  favoriteGroups: DataWrapper<FavoriteGroup[]>;

  // favoriteFriends: DataWrapper<LimitedUserFriend[]>;
  // favoriteWorlds: DataWrapper<LimitedWorld[]>;
  // favoriteAvatars: DataWrapper<Avatar[]>;

}

const Context = createContext<DataContextType | undefined>(undefined)

const useData = () => {
  const context = useContext(Context)
  if (!context) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

const DataProvider: React.FC<{ children?: React.ReactNode }> = ({children}) => {
  const auth = useAuth();
  const vrc = useVRChat();


  /** APIs */
  // data getters
  const getCurrentUser = async () => (await vrc.authenticationApi.getCurrentUser()).data;
  const getFavoriteGroups = async () => (await vrc.favoritesApi.getFavoriteGroups()).data;
  //
  const values = {
    currentUser: initDataWrapper<CurrentUser | undefined>(undefined, getCurrentUser),
    favoriteGroups: initDataWrapper<FavoriteGroup[]>([], getFavoriteGroups),
  }

  const fetchAll = async () => {
    await Promise.all(Object.values(values).map(v => v.fetch()));
  }
  const clearAll = async () => {
    await Promise.all(Object.values(values).map(v => v.clear()));
  }

  useEffect(() => {
    if (auth.user) {
      fetchAll();
    } else {
      clearAll(); // clear data on logout
    }
  }, [auth.user]);

  /** Pipelines */
  // log pipeline messages for debug
  useEffect(() => {
    const msg = vrc.pipeline?.lastMessage;
    if (!msg) return ;
    if (PipelineType.includes(msg.type as any)) {
      console.log("Pipeline message:", msg.type);
    } else {
      console.log("Pipeline unknown message:", msg.type);
    }
  }, [vrc.pipeline?.lastMessage]);

  return (
    <Context.Provider value={{
      fetchAll,
      clearAll,
      ...values
    }}>
      {children}
    </Context.Provider>
  );
}

function initDataWrapper<T>(initialData: T, getter: ()=>Promise<T>): DataWrapper<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fetch = async () => {
    setIsLoading(true);
    try {
      const newData = await getter();
      setData(newData);
      return newData;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const set = (newData: T) => setData(newData);
  const clear = () => setData(initialData);
  return { data, fetch, set, clear, isLoading };
}

export { DataProvider, useData };
