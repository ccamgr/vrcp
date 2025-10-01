import { createContext, useContext, useEffect } from "react";
import * as sqlite from "expo-sqlite";
import { drizzle } from 'drizzle-orm/expo-sqlite';
import Constants from 'expo-constants';
import { SQLiteColumn, SQLiteInsertValue, sqliteTable, SQLiteTableWithColumns, SQLiteUpdateSetSource, TableConfig } from "drizzle-orm/sqlite-core";
import { eq, sql, SQL } from "drizzle-orm";
import { avatarsTable, favoriteGroupsTable, groupsTable, usersTable, worldsTable } from "@/db/schema";
import { migrations } from "@/db/migration";
import Storage from "expo-sqlite/kv-store";
import * as FileSystem from "expo-file-system";
// provide db access globally


interface TableWrapper<
  T extends SQLiteTableWithColumns<any>
> {
  _tableName: string;
  get: (id: T["$inferSelect"]["id"]) => Promise<T["$inferSelect"] | null>;
  create: (data: SQLiteInsertValue<T>) => Promise<T["$inferSelect"]>;
  update: (id: T["$inferInsert"]["id"], data: SQLiteUpdateSetSource<T>) => Promise<T["$inferSelect"]>;
  delete: (id: T["$inferSelect"]["id"]) => Promise<boolean>;
}

interface DBContextType {
  _db: ReturnType<typeof drizzle>;
  _fileName: string;
  _resetDB: () => Promise<void>;
  users: TableWrapper<typeof usersTable>;
  worlds: TableWrapper<typeof worldsTable>;
  avatars: TableWrapper<typeof avatarsTable>;
  groups: TableWrapper<typeof groupsTable>;
  favoriteGroups: TableWrapper<typeof favoriteGroupsTable>;
}
const Context = createContext<DBContextType | undefined>(undefined);

const useDB = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useDB must be used within a DBProvider");
  return context;
} 

const DBProvider: React.FC<{ children?: React.ReactNode }> = ({
  children
}) => {
  const fileName = Constants.expoConfig?.extra?.vrcmm?.buildProfile !== "production" ? "vrcmm-dev.db" : "vrcmm.db";
  const expoDB = sqlite.openDatabaseSync(fileName, undefined, sqlite.defaultDatabaseDirectory);
  const db = drizzle(expoDB);




  // migration on initial load
  useEffect(() => {
    applyMigrations(false);
  }, []); 

  const wrappers = {
    users: initTableWrapper(db, usersTable),
    worlds: initTableWrapper(db, worldsTable),
    avatars: initTableWrapper(db, avatarsTable),
    groups: initTableWrapper(db, groupsTable),
    favoriteGroups: initTableWrapper(db, favoriteGroupsTable),
  }

  const applyMigrations = async (init: boolean = false) => {
    const currentVersion = init ? -1 : Number((await Storage.getItemAsync('dbVersion')) ?? -1); // -1:未作成
    const appliables = Object.values(migrations).filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);
    if (appliables.length === 0) {
      console.log("DB version up to date:", currentVersion);
    } else {
      console.log("updating DB from version", currentVersion, "to", appliables[appliables.length - 1].version);
      await db.transaction(async (tx) => {
        for (const m of appliables) {
          await tx.run(m.sql)
        }
      }, { behavior: "immediate" });
      await Storage.setItemAsync('dbVersion', String(appliables[appliables.length - 1].version));
      console.log("DB updated to version", appliables[appliables.length - 1].version);
    }
  }
  const resetDB = async () => {
    try {
      const tables = Object.values(wrappers).map(w => w._tableName);
      await db.transaction(async (tx) => {
        for (const table of tables) {
          // drop table if exists
          await tx.run(`DROP TABLE IF EXISTS "${table}";`);
        }
      });
      await applyMigrations(true);
      console.log("DB reset complete");
    } catch (error) {
      console.error("Error resetting DB:", error);
    } 
  }

  return (
    <Context.Provider value={{
      _db: db, 
      _fileName: fileName,
      _resetDB: resetDB,
      ...wrappers
    }}>
      {children}
    </Context.Provider>
  );
}

const initTableWrapper = <
  T extends TableConfig,
>(
  db: ReturnType<typeof drizzle>, 
  table: SQLiteTableWithColumns<T>
): TableWrapper<SQLiteTableWithColumns<T>> => {
  // if not exist, create table

  // @ts-ignore
  const tableName = table.getSQL().usedTables?.[0];

  // CRUD operations
  const get = async (id: typeof table.$inferSelect['id']): Promise<SQLiteTableWithColumns<T>["$inferSelect"] | null> => {
    const result = await db.select().from(table).where(
      eq(table.id, id)
    ).limit(1).get();
    return result as SQLiteTableWithColumns<T>["$inferSelect"] | null;
  }
  const create = async (data: SQLiteInsertValue<typeof table>): Promise<SQLiteTableWithColumns<T>["$inferSelect"]> => {
    const result = await db.insert(table).values(data).returning().get();
    return result as SQLiteTableWithColumns<T>["$inferSelect"];
  }
  const update = async (id: typeof table.$inferSelect['id'], data: SQLiteUpdateSetSource<typeof table>): Promise<SQLiteTableWithColumns<T>["$inferSelect"]> => {
    const result = await db.update(table).set(data).where(
      eq(table.id, id)
    ).returning().get();
    return result as SQLiteTableWithColumns<T>["$inferSelect"];
  }
  const del = async (id: SQLiteTableWithColumns<T>["$inferSelect"]['id']): Promise<boolean> => {
    const result = await db.delete(table).where(
      eq(table.id, id)
    ).execute();
    return result.changes > 0;
  }

  return { get, create, update, delete: del, _tableName: tableName ?? "" };
}

export { DBProvider, useDB };