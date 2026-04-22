
import rawVersions from '@/../versions.json';
import { constants } from "@/configs/const";
import StorageWrapper from './wrappers/storageWrapper';


// object
export function omitObject<T extends object>(obj: T, ...keys: Array<keyof T>): Partial<T> {
  const newObj: Partial<T> = {};
  const ks: Array<keyof T> = Object.keys(obj) as Array<keyof T>;
  ks.forEach((key: keyof T) => {
    if (!keys.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

export function mergeWithDefaults<Tbase extends object, Toverride extends object>(
  defaults: Tbase,
  overrides: Toverride,
): Tbase {

  // primitive => override
  // array => override
  // object => merge recursively
  const result: any = { ...defaults };
  const keys = Object.keys({ ...defaults, ...overrides }) as Array<keyof Toverride & keyof Tbase>;
  for (const key of keys) {
    if (overrides[key] === undefined) {
      result[key] = defaults[key as keyof Tbase];
    } else if (isOverridable(defaults[key as keyof Tbase], overrides[key as keyof Toverride])) {
      result[key] = overrides[key];
    } else {
      if (typeof defaults[key as keyof Tbase] === "object" && typeof overrides[key as keyof Toverride] === "object") {
        result[key] = mergeWithDefaults(
          defaults[key as keyof Tbase] as object,
          overrides[key as keyof Toverride] as object,
        );
      }
    }
  }

  return result;
}

function isOverridable(base: any, target: any): boolean {
  if (target === null) return false;
  if (Array.isArray(base) && Array.isArray(target)) return true;
  if (typeof base !== "object" && typeof target !== "object") return true;
  return typeof base == typeof target;
}


// error
export function extractErrMsg(error: any): string {
  return error.response?.data?.error?.message || error.message || String(error);
};

// user agent
export function getUserAgent(): string {
  const name = constants.name;
  const version = constants.version;
  const contact = constants.contact;
  return `${name}/${version} ${contact}`;
}

// color
export function getTintedColor(hexColor: string, tintFactor: number = 0.60): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const a = hexColor.length == 9 ? parseInt(hexColor.slice(7, 9), 16) : 255;
  const newAlpha = Math.floor(tintFactor * a);
  const newHex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}${newAlpha.toString(16).padStart(2, "0")}`;
  return newHex;
}

// appVersion
export async function isNewVersion(): Promise<boolean> {
  // e.g. "1.0.0:2025-12-25"
  const storedVersionKey = await StorageWrapper.getItemAsync("releasenote_lastversionkey");
  const currentVersion = rawVersions.versions?.[0];
  if (!storedVersionKey || !currentVersion) return false;
  const currentVersionKey = `${currentVersion.nativeVersion}:${currentVersion.updates?.[0].date}`;
  return storedVersionKey !== currentVersionKey;
}
export function updateLastVersion(): void {
  const currentVersion = rawVersions.versions?.[0];
  if (!currentVersion) return;
  const currentVersionKey = `${currentVersion.nativeVersion}:${currentVersion.updates?.[0].date}`;
  StorageWrapper.setItemAsync("releasenote_lastversionkey", currentVersionKey);
}


// byte size
/**
 * バイト数を人が読みやすい形式 (KB, MB, GB...) に変換します
 */
export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes < 0) return "Invalid size";
  if (bytes === 0) return '0 KB';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `< 1 KB`; // 1KB未満は「x B」ではなく「< 1 KB」と表示
  if (i >= sizes.length) return `${parseFloat((bytes / Math.pow(k, sizes.length - 1)).toFixed(dm))} ${sizes[sizes.length - 1]}`; // TB以上はTBで表示
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
