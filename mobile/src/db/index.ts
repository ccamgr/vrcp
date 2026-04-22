import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { avatars, worlds, groups, users, logs } from "./schema";
import { eq, and, like, lt, not, sql } from "drizzle-orm";
import migrations from "./migration/migrations";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import FileWrapper from "@/lib/wrappers/fileWrapper";

// 1. Create DB instance as a singleton
const expoDb = openDatabaseSync("vrcp.db", undefined, defaultDatabaseDirectory);
export const db = drizzle(expoDb);

// 3. Cache management utilities
export const dbManager = {

  getDBFileSize: async () => {
    const dbFileInfo = await FileWrapper.getInfoAsync(FileWrapper.documentDirectory + "SQLite/vrcp.db");
    return dbFileInfo.exists ? dbFileInfo.size : -1; // size is not tracked in DB, so return -1 to indicate unknown
  },

  // Drop all tables including __drizzle_migrations
  resetDB: async () => {
    console.log("Starting full database reset...");

    try {
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
};
