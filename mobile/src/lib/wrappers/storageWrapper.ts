import { Platform } from 'react-native';
import AsyncStorage from 'expo-sqlite/kv-store';

// import * as Sharing from 'expo-sharing';


const isNative = Platform.OS !== 'web';


class StorageWrapper {

  static async getItemAsync(key: string) {
    if (isNative) {
      return AsyncStorage.getItemAsync(key);
    } else {
      return window.localStorage.getItem(key);
    }
  };

  static async setItemAsync(key: string, value: string) {
    if (isNative) {
      return AsyncStorage.setItemAsync(key, value);
    } else {
      return window.localStorage.setItem(key, value);
    }
  }

  static async removeItemAsync(key: string) {
    if (isNative) {
      return AsyncStorage.removeItemAsync(key);
    } else {
      return window.localStorage.removeItem(key);
    }
  }

  static async multiSet(items: [string, string][]) {
    if (isNative) {
      return AsyncStorage.multiSet(items);
    } else {
      items.forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
      });
      return;
    }
  }

  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    if (isNative) {
      return AsyncStorage.multiGet(keys);
    } else {
      return keys.map(key => [key, window.localStorage.getItem(key)]);
    }
  }

  static async multiRemove(keys: string[]) {
    if (isNative) {
      return AsyncStorage.multiRemove(keys);
    } else {
      keys.forEach(key => {
        window.localStorage.removeItem(key);
      });
      return;
    }
  }

}

export default StorageWrapper;