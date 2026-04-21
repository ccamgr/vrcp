import { createContext, useContext, useEffect } from "react";
import * as sqlite from "expo-sqlite";
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { SQLiteColumn, SQLiteInsertValue, sqliteTable, SQLiteTableWithColumns, SQLiteUpdateSetSource, TableConfig } from "drizzle-orm/sqlite-core";
import { and, eq, like, not, sql, SQL } from "drizzle-orm";
import { avatarsTable, favoriteGroupsTable, groupsTable, logsTable, usersTable, worldsTable } from "@/db/schema/schema";
import { migrations } from "@/db/migration";
import Storage from "expo-sqlite/kv-store";


// provide db access globally


export interface TableWrapper<
  T extends SQLiteTableWithColumns<any>,
> {
  _tableName: string;
  _table: T;
  get: (id: T["$inferSelect"]["id"]) => Promise<T["$inferSelect"] | null>;
  getList: (options?: DBGetListOptions<any>) => Promise<T["$inferSelect"][]>;
  create: (data: SQLiteInsertValue<T>) => Promise<T["$inferSelect"]>;
  update: (id: T["$inferInsert"]["id"], data: SQLiteUpdateSetSource<T>) => Promise<T["$inferSelect"]>;
  delete: (id: T["$inferSelect"]["id"]) => Promise<boolean>;
}

interface DBContextType {
  _db: ReturnType<typeof drizzle>;
  _fileName: string;
  resetDB: () => Promise<void>;
  getDBInfo: () => Promise<{ size: number; rows: number; }>;
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
  const fileName = "vrcp.db";
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

    // logs table is handled separately due to its different structure and usage patterns
    logs: initTableWrapper(db, logsTable),
  }

  const applyMigrations = async (init: boolean = false) => {
    let currentVersion = parseInt(await Storage.getItemAsync('dbVersion') ?? "-1") || -1;
    let targetVersion = Math.max(...Object.values(migrations).map(v => Number(v.version)));
    const needReset = init || isNaN(currentVersion) || currentVersion < 0 || currentVersion > targetVersion;
    if (!needReset && targetVersion === currentVersion) {
      console.log("DB version up to date:", currentVersion);
    } else {
      const appliables = Object.values(migrations).filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version);
      console.log("updating DB from version", currentVersion, "to", targetVersion);
      await db.transaction(async (tx) => {
        if (needReset) {
          const existTables = await db.select({ name: sql`name` }).from(sql`sqlite_master`).where(
            and(
              eq(sql`type`, "table"),
              not(like(sql`name`, "sqlite_%")),
            )
          ).all();
          console.log("Resetting DB..., dropping tables:", existTables.map(t => t.name).join(", "));
          for (const table of existTables) {
            // drop table if exists
            await tx.run(`DROP TABLE IF EXISTS "${table.name}";`);
          }
        }
        console.log("Applying migrations...");
        for (const m of appliables) {
          for (const stmt of m.sql) {
            await tx.run(stmt);
          }
        }
      }, { behavior: "immediate" });
      await Storage.setItemAsync('dbVersion', targetVersion.toString());
      console.log("DB version up to date:", targetVersion);
    }
  }
  const resetDB = async () => {
    try {
      await applyMigrations(true);
      console.log("DB reset complete");
    } catch (error) {
      console.error("Error resetting DB:", error);
    }
  }
  const getDBInfo = async (): Promise<{ size: number; rows: number; }> => {
    try {
      // const size = fileInfo.size;
      // const tables = Object.values(wrappers).map(w => w._table);
      // let rows = 0;
      // for (const t of tables) {
      //   const rowResult = (await db.select().from(t)).length
      //   rows += rowResult;
      // }
      return { size: 0, rows: 0 };
    } catch (error) {
      console.error("Error getting DB info:", error);
      return { size: 0, rows: 0 };
    }
  }

  return (
    <Context.Provider value={{
      _db: db,
      _fileName: fileName,
      resetDB,
      getDBInfo,
      ...wrappers
    }}>
      {children}
    </Context.Provider>
  );
}


// == Table Wrapper Factory ==

export interface DBGetListOptions<T extends TableConfig = TableConfig> {
  where?: SQL;
  limit?: number;
  offset?: number;
  // Allow only SQL expressions (like desc()) or actual columns from this specific table
  orderBy?: SQL | T["columns"][keyof T["columns"]] | (SQL | T["columns"][keyof T["columns"]])[];
}


/**
 *
 * @param db
 * @param table
 * @returns CRUD操作を備えたテーブルラッパー id指定のGET,DELETEと、データ指定のCREATE,UPDATEを提供
 */
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
  const getList = async (options?: DBGetListOptions<T>): Promise<SQLiteTableWithColumns<T>["$inferSelect"][]> => {
    // Use $dynamic() to build queries conditionally
    let query = db.select().from(table).$dynamic();

    if (options?.where) {
      query = query.where(options.where);
    }
    if (options?.orderBy) {
      const orderArgs = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
      query = query.orderBy(...orderArgs);
    }
    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      query = query.offset(options.offset);
    }

    const result = await query.all();
    return result as SQLiteTableWithColumns<T>["$inferSelect"][];
  }

  return { get, getList, create, update, delete: del, _tableName: tableName ?? "", _table: table };
}

export { DBProvider, useDB };


// // import { eq, desc, and, gt } from "drizzle-orm";

// // Get all logs
// const allLogs = await dbLogs.getList();

// // Get logs with conditions
// const recentJoinLogs = await dbLogs.getList({
//   where: and(
//     eq(logs.eventType, "PlayerJoin"),
//     gt(logs.timestamp, 1713500000000)
//   ),
//   orderBy: desc(logs.timestamp),
//   limit: 50,
//   offset: 0
// });

