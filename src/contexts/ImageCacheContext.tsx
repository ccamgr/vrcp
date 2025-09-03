

// VRCのAPIを使うためのContext
import { omitObject } from "@/lib/objectUtils";
import * as FileSystem from 'expo-file-system';
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Image } from "react-native";
import useVRChat from "./VRChatContext";



interface ImageCacheContextType {
  // CachedImage: React.FC<{url: string}>;
  clearCache: () => Promise<void>;
  getCacheInfo: () => Promise<{size: number, count: number}>;
}
const Context = createContext<ImageCacheContextType | undefined>(undefined)


const cacheDir = `${FileSystem.documentDirectory}cache/images`;
const getLocalUri = (url: string) => cacheDir + '/' + url.split("/").pop();



const useImageCache = () => {
  const context = useContext(Context)
  if (!context) {
    throw new Error("useCache must be used within a CacheProvider")
  }
  return context
}
const ImageCacheProvider: React.FC<{ children?: ReactNode }> = ({children}) => {  
  // create cache dir if not exist
  useEffect(() => {
    FileSystem.getInfoAsync(cacheDir)
    .then((dirInfo) => {
      if (!dirInfo.exists) FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    })
    .catch((error) => {
      console.error("Error creating cache directory:", error);
    });
  }, [])

  const clearCache = async () => {
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
  };

  const getCacheInfo = async () => {
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      return { size: dirInfo.size, count: files.length };
    }
    return { size: 0, count: 0 };
  }

  return (
    <Context.Provider value={{
      clearCache,
      getCacheInfo
    }}>
      {children}
    </Context.Provider>
  )
} 

const CachedImage = ({src:remoteUri , ...rest}: {src: string, [key: string]: any}) => {
    const [src, setSrc] = useState<string | undefined>();
    const headers = useVRChat().config?.baseOptions["headers"] || {};
    
    const load = async () => {
      try {
        const localUri = getLocalUri(remoteUri);
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists) {
          setSrc(localUri);
        } else {
          const { uri } = await FileSystem.downloadAsync(remoteUri, localUri, { headers: headers});
          setSrc(uri);
        }
      } catch (error) {
        console.error("Error loading image:", error);
      }
    }
    useEffect(() => {
      load();
    }, [remoteUri])

    return (
      <Image
        source={{ uri: src }}
        style={[{ resizeMode: "cover" }, rest.style]}
        {...omitObject(rest, "style")}
      />
    );
  };


export default useImageCache
export { CachedImage, ImageCacheProvider };

