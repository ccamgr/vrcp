import { sql } from "drizzle-orm";
import { LogPayload } from "@/generated/desktopapi/type";
import { analyzeSessions } from "@/lib/funcs/analizeSessions";
import { db } from "./index";
import { sessionsRepo } from "./repogitories/sessions";

interface LegacyLogRow {
  hash: number;
  timestamp: number;
  data: string;
}

export async function migrateLegacyLogs() {
  const tables = await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'logs'`,
  );
  if (tables.length === 0) return;

  const rows = await db.all<LegacyLogRow>(
    sql`SELECT hash, timestamp, data FROM logs ORDER BY timestamp, id`,
  );
  const logs = rows.map((row): LogPayload => {
    try {
      return { hash: row.hash, timestamp: row.timestamp, event: JSON.parse(row.data) };
    } catch (error) {
      throw new Error(`Invalid legacy log ${row.hash}: ${String(error)}`);
    }
  });
  const endTime = rows.at(-1)?.timestamp ?? 0;
  const sessions = analyzeSessions(logs, { start: 0, end: endTime }).map((session, index) => ({
    ...session,
    sourceId: `legacy:${session.location}:${session.startTime}:${index}`,
  }));
  await sessionsRepo.bulkUpsert(sessions);
  await db.run(sql`DROP TABLE logs`);
}
