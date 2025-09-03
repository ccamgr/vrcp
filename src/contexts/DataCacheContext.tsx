// VRCのAPIを使うためのContext
import { User, World } from "@/api/vrchat";
import { createContext, ReactNode, useContext, useRef } from "react";


interface Cache<T> {
  expiredAt: Date;
  value: T;
}

interface CacheWrapper<T> {
  get: (id: string) => T | undefined;
  set: (id: string, data: T) => void;
  delete: (id: string) => void;
  clear: () => void;
}

interface CacheContextType {
  // users: Cache<User>;
  // worlds: Cache<World>;
}
const Context = createContext<CacheContextType | undefined>(undefined)

const useCache = () => {
  const context = useContext(Context)
  if (!context) {
    throw new Error("useCache must be used within a CacheProvider")
  }
  return context
}
const CacheProvider: React.FC<{ children?: ReactNode }> = ({children}) => {
  const users = useRef<Map<string, User>>(new Map());
  const worlds = useRef<Map<string, World>>(new Map());

  return (
    <Context.Provider value={{
      users,
      worlds
    }}>
      {children}
    </Context.Provider>
  )
} 



export default useCache
export { CacheProvider };

