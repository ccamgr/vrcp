import { SQL, eq, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";
import {
  SQLiteTableWithColumns,
  SQLiteInsertValue,
  SQLiteUpdateSetSource,
} from "drizzle-orm/sqlite-core";

// GetListOptions for flexible querying using Drizzle's internal type definitions
export interface GetListOptions<TTable extends SQLiteTableWithColumns<any>> {
  where?: SQL;
  limit?: number;
  offset?: number;
  orderBy?:
  | SQL
  | TTable["_"]["columns"][keyof TTable["_"]["columns"]]
  | (SQL | TTable["_"]["columns"][keyof TTable["_"]["columns"]])[];
}

// Generic repository interface providing common CRUD logic
// Assumes the table has a primary key column named "id" of type string
interface BaseRepo<
  TTable extends SQLiteTableWithColumns<any>,
  Domain extends any
> {
  get: (id: string) => Promise<Domain | null>;
  getList: (options?: GetListOptions<TTable>) => Promise<Domain[]>;
  create: (data: Domain) => Promise<Domain>;
  update: (id: string, data: Partial<Domain>) => Promise<Domain>;
  upsert: (data: Domain) => Promise<Domain>;
  delete: (id: string) => Promise<boolean>;
  count: () => Promise<number>;
}

export const createBaseRepo = <
  TTable extends SQLiteTableWithColumns<any>,
  Domain extends any
>(
  db: ReturnType<typeof drizzle>,
  table: TTable,
  convertToDB: (domain: Domain) => SQLiteInsertValue<TTable>,
  convertFromDB: (dbData: TTable["$inferSelect"]) => Domain
): BaseRepo<TTable, Domain> => {
  const get = async (id: string): Promise<Domain | null> => {
    const result = await db
      .select()
      .from(table)
      // Use type assertion to avoid TS errors since TTable is generic
      .where(eq(table.id, id))
      .limit(1)
      .get();
    return result ? convertFromDB(result as TTable["$inferSelect"]) : null;
  };

  const create = async (data: Domain): Promise<Domain> => {
    const dbData = convertToDB(data);
    const result = await db.insert(table).values(dbData).returning().get();
    return convertFromDB(result as TTable["$inferSelect"]);
  };

  const update = async (
    id: string,
    data: Partial<Domain>
  ): Promise<Domain> => {
    const existing = await get(id);
    if (!existing) throw new Error("Record not found");
    const dbData = convertToDB({ ...existing, ...data });
    const result = await db
      .update(table)
      .set(dbData)
      .where(eq(table.id, id))
      .returning()
      .get();
    return convertFromDB(result as TTable["$inferSelect"]);
  };

  const upsert = async (data: Domain): Promise<Domain> => {
    const dbData = convertToDB(data);
    const result = await db
      .insert(table)
      .values(dbData)
      .onConflictDoUpdate({
        target: table.id,
        // Assert the data type for the set operation
        set: dbData as SQLiteUpdateSetSource<TTable>,
      })
      .returning()
      .get();
    return convertFromDB(result as TTable["$inferSelect"]);
  };

  const del = async (id: string): Promise<boolean> => {
    const result = await db
      .delete(table)
      .where(eq(table.id, id))
      .execute();
    return result.changes > 0;
  };

  const getList = async (options?: GetListOptions<TTable>): Promise<Domain[]> => {
    let query = db.select().from(table).$dynamic();

    if (options?.where) query = query.where(options.where);
    if (options?.orderBy) {
      const orderArgs = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
      query = query.orderBy(...orderArgs);
    }
    if (options?.limit !== undefined) query = query.limit(options.limit);
    if (options?.offset !== undefined) query = query.offset(options.offset);

    const result = await query.all();
    return result.map(convertFromDB);
  };

  const count = async (): Promise<number> => {
    const result = await db.select({ count: sql<number>`count(*)` }).from(table);
    return result[0].count;
  };

  return { get, create, update, upsert, delete: del, getList, count };
};



interface BaseCacheRepo<
  TTable extends SQLiteTableWithColumns<any>,
  Domain extends any
> extends BaseRepo<TTable, Domain> {
  clearExpired: () => Promise<void>;
  clearAll: () => Promise<void>;
  setWithTTL: (data: Domain, ttl: number) => Promise<Domain>;
  getWithTTL: (id: string) => Promise<{ data: Domain, ttl: number } | null>;
}

export const createBaseCacheRepo = <TTable extends SQLiteTableWithColumns<any>, Domain extends any>(
  db: ReturnType<typeof drizzle>,
  table: TTable,
  convertToDB: (domain: Domain) => SQLiteInsertValue<TTable>,
  convertFromDB: (dbData: TTable["$inferSelect"]) => Domain
): BaseCacheRepo<TTable, Domain> => {
  const repo = createBaseRepo(db, table, convertToDB, convertFromDB);

  const getWithTTL = async (id: string): Promise<{ data: Domain, ttl: number } | null> => {
    const now = Date.now();
    const result = await db
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1)
      .get();

    if (!result) return null;

    const data = result as TTable["$inferSelect"];
    const ttl = (data as any).expiresAt - now; // Assume the table has an expiresAt column
    return { data: convertFromDB(data), ttl };
  };

  const clearExpired = async () => {
    const now = Date.now();
    await db.delete(table).where(lt(table.expiresAt, now)).execute();
  };
  const clearAll = async () => {
    await db.delete(table).execute();
  };

  const setWithTTL = async (data: Domain, ttl: number) => {
    const expiresAt = Date.now() + ttl;
    const dbData = { ...convertToDB(data), expiresAt } as SQLiteInsertValue<TTable>;
    const result = await db
      .insert(table)
      .values(dbData)
      .onConflictDoUpdate({
        target: table.id,
        set: dbData as SQLiteUpdateSetSource<TTable>,
      })
      .returning()
      .get();
    return convertFromDB(result as TTable["$inferSelect"]);
  };

  return { ...repo, clearExpired, clearAll, setWithTTL, getWithTTL };
};
