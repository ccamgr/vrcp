import { SQL, eq } from "drizzle-orm";
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
export interface BaseRepo<TTable extends SQLiteTableWithColumns<any>> {
  get: (id: string) => Promise<TTable["$inferSelect"] | null>;
  getList: (options?: GetListOptions<TTable>) => Promise<TTable["$inferSelect"][]>;
  create: (data: SQLiteInsertValue<TTable>) => Promise<TTable["$inferSelect"]>;
  update: (id: string, data: SQLiteUpdateSetSource<TTable>) => Promise<TTable["$inferSelect"]>;
  upsert: (data: SQLiteInsertValue<TTable>) => Promise<TTable["$inferSelect"]>;
  delete: (id: string) => Promise<boolean>;
}

export const createBaseRepository = <TTable extends SQLiteTableWithColumns<any>>(
  db: ReturnType<typeof drizzle>,
  table: TTable
): BaseRepo<TTable> => {
  const get = async (id: string): Promise<TTable["$inferSelect"] | null> => {
    const result = await db
      .select()
      .from(table)
      // Use type assertion to avoid TS errors since TTable is generic
      .where(eq((table as any).id, id))
      .limit(1)
      .get();
    return (result as TTable["$inferSelect"]) || null;
  };

  const create = async (data: SQLiteInsertValue<TTable>): Promise<TTable["$inferSelect"]> => {
    const result = await db.insert(table).values(data).returning().get();
    return result as TTable["$inferSelect"];
  };

  const update = async (
    id: string,
    data: SQLiteUpdateSetSource<TTable>
  ): Promise<TTable["$inferSelect"]> => {
    const result = await db
      .update(table)
      .set(data)
      .where(eq((table as any).id, id))
      .returning()
      .get();
    return result as TTable["$inferSelect"];
  };

  const upsert = async (data: SQLiteInsertValue<TTable>): Promise<TTable["$inferSelect"]> => {
    const result = await db
      .insert(table)
      .values(data)
      .onConflictDoUpdate({
        target: (table as any).id,
        // Assert the data type for the set operation
        set: data as SQLiteUpdateSetSource<TTable>,
      })
      .returning()
      .get();
    return result as TTable["$inferSelect"];
  };

  const del = async (id: string): Promise<boolean> => {
    const result = await db
      .delete(table)
      .where(eq((table as any).id, id))
      .execute();
    return result.changes > 0;
  };

  const getList = async (options?: GetListOptions<TTable>): Promise<TTable["$inferSelect"][]> => {
    let query = db.select().from(table).$dynamic();

    if (options?.where) query = query.where(options.where);
    if (options?.orderBy) {
      const orderArgs = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
      query = query.orderBy(...orderArgs);
    }
    if (options?.limit !== undefined) query = query.limit(options.limit);
    if (options?.offset !== undefined) query = query.offset(options.offset);

    const result = await query.all();
    return result as TTable["$inferSelect"][];
  };

  return { get, create, update, upsert, delete: del, getList };
};
