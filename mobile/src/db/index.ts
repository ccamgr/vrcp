import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { avatars, worlds, groups, users, logs } from "./schema";
import { eq, and, like, lt, not, sql } from "drizzle-orm";
import migrations from "./migration/migrations";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

// 1. Create DB instance as a singleton
const expoDb = openDatabaseSync("vrcp.db", undefined, defaultDatabaseDirectory);
export const dbPath = `${defaultDatabaseDirectory}vrcp.db`;
export const db = drizzle(expoDb);

// 3. Cache management utilities
export const dbManager = {
  clearExpired: async () => {
    const now = Date.now();
    await db.delete(users).where(lt(users.expiresAt, now)).execute();
    await db.delete(avatars).where(lt(avatars.expiresAt, now)).execute();
    await db.delete(worlds).where(lt(worlds.expiresAt, now)).execute();
    await db.delete(groups).where(lt(groups.expiresAt, now)).execute();

    // Logs are history data, so they are excluded from cache expiration
    // await db.delete(logs).where(lt(logs.expiresAt, now)).execute();
  },

  clearAll: async () => {
    // Clear all cache tables
    await db.delete(users).execute();
    await db.delete(avatars).execute();
    await db.delete(worlds).execute();
    await db.delete(groups).execute();
    console.log("All DB caches completely cleared.");

    // Note: If you want to clear logs on full reset, uncomment the line below
    // await db.delete(logs).execute();
  },

  resetDB: async () => {
    console.log("Starting full database reset...");

    try {
      // Drop all tables including __drizzle_migrations
      await db.transaction(async (tx) => {
        const existTables = await tx.select({ name: sql`name` })
          .from(sql`sqlite_master`)
          .where(
            and(
              eq(sql`type`, "table"),
              not(like(sql`name`, "sqlite_%"))
            )
          ).all();

        console.log("Dropping tables:", existTables.map(t => t.name).join(", "));
        for (const table of existTables) {
          await tx.run(sql.raw(`DROP TABLE IF EXISTS "${table.name}";`));
        }
      }, { behavior: "immediate" });

      // Run standard Drizzle migration to recreate all tables
      console.log("Recreating tables via Drizzle migration...");
      await migrate(db, migrations);

      console.log("Full database reset completed successfully.");
    } catch (error) {
      console.error("Critical error during database reset:", error);
      throw error;
    }
  },

  getDBStats: async () => {
    try {
      const [u, a, w, g] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(avatars),
        db.select({ count: sql<number>`count(*)` }).from(worlds),
        db.select({ count: sql<number>`count(*)` }).from(groups),
      ]);
      return {
        rows: Number(u[0].count) + Number(a[0].count) + Number(w[0].count) + Number(g[0].count)
      };
    } catch (e) {
      console.warn("Failed to get DB stats:", e);
      return { rows: 0 };
    }
  }
};
