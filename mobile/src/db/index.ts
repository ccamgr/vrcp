import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { createBaseRepository } from "./repogitories/_baseRepo";
// import schema, baseRepo, etc...

// 1. シングルトンとしてDBインスタンスを作成
const expoDb = openDatabaseSync("vrcp.db", undefined, defaultDatabaseDirectory);
export const db = drizzle(expoDb);

// 2. リポジトリを初期化してエクスポート（どこからでも使える）
// export const avatarRepo = createBaseRepository(db, avatars);
// export const worldRepo = createBaseRepository(db, worlds);
// ...

// 3. キャッシュ管理などの便利関数もここにまとめておく（あるいは別ファイル cacheManager.ts へ）
export const cacheManager = {
  clearExpired: async () => {
    const now = Date.now();
    // await db.delete(avatars).where(lt(avatars.expiresAt, now)).execute();
    // await db.delete(worlds).where(lt(worlds.expiresAt, now)).execute();
    // ...
  },
  clearAll: async () => {
    // await db.delete(avatars).execute();
    // await db.delete(worlds).execute();
    // ...
  }
};
