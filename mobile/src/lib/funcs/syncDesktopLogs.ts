import { sessionsRepo } from "@/db/repogitories/sessions";
import { StoredSession } from "@/db/schema/sessions";
import { DesktopSession, getDesktopSessions } from "@/lib/desktopApi";
import { extractErrMsg } from "@/lib/utils";
import StorageWrapper from "@/lib/wrappers/storageWrapper";

const LEGACY_SYNC_METADATA_KEYS = [
  "DESKTOP_LOG_LAST_SYNC_TIME",
  "DESKTOP_SESSION_GENERATION",
  "DESKTOP_SESSION_SOURCE",
  "DESKTOP_SESSION_SCHEMA_VERSION",
];
const LEGACY_SESSION_SCHEMA_VERSION = 1;
const CURRENT_SESSION_SCHEMA_VERSION = 2;
const SYNC_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_PAGE_SIZE = 200;
const MAX_SYNC_RETRIES = 2;

export async function syncDesktopLogs(
  desktopUrl: string,
  isFullSync: boolean = false,
  onProgress?: (msg: string) => void,
  retryCount: number = 0,
): Promise<number> {
  if (!desktopUrl) {
    throw new Error("Desktop App URL is not configured.");
  }

  onProgress?.("Calculating sync period...");

  try {
    const snapshot = await sessionsRepo.getSyncSnapshot();
    const startTimestamp = isFullSync
      ? undefined
      : Date.now() - SYNC_LOOKBACK_MS;

    onProgress?.("Fetching data from desktop...");

    let cursor: string | undefined;
    let generation: number | undefined;
    let source: string | undefined;
    let schemaVersion: number | undefined;
    const items: StoredSession[] = [];
    const cursors = new Set<string>();
    do {
      const response = await getDesktopSessions(desktopUrl, {
        start: startTimestamp,
        cursor,
        limit: SESSION_PAGE_SIZE,
      });
      if (generation !== undefined && generation !== response.data.generation) {
        return retrySync(
          desktopUrl,
          true,
          onProgress,
          retryCount,
          "Desktop session data changed during synchronization.",
        );
      }
      const pageSource = response.data.source;
      if (source !== undefined && source !== pageSource) {
        return retrySync(
          desktopUrl,
          true,
          onProgress,
          retryCount,
          "Desktop source changed during synchronization.",
        );
      }
      const pageSchemaVersion = getSessionSchemaVersion(
        response.data.schemaVersion,
      );
      if (schemaVersion !== undefined && schemaVersion !== pageSchemaVersion) {
        throw new Error(
          "Desktop session schema changed during synchronization.",
        );
      }
      validateSessionParticipants(response.data.sessions, pageSchemaVersion);
      generation = response.data.generation;
      source = pageSource;
      schemaVersion = pageSchemaVersion;
      items.push(
        ...response.data.sessions.map((session) => ({
          sourceId: `${pageSource}:${generation}:${session.sourceId}`,
          worldName: session.worldName,
          location: session.instanceId,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMs: session.durationMs,
          username: session.username,
          players: session.players,
        })),
      );
      cursor = response.data.nextCursor ?? undefined;
      if (cursor && (cursors.has(cursor) || cursors.size >= 10_000)) {
        throw new Error("Desktop returned an invalid session page cursor.");
      }
      if (cursor) cursors.add(cursor);
    } while (cursor);

    if (
      generation === undefined ||
      source === undefined ||
      schemaVersion === undefined
    ) {
      throw new Error("Desktop returned incomplete session metadata.");
    }

    const writeResult = await sessionsRepo.applySync({
      expectedRevision: snapshot.revision,
      source,
      generation,
      schemaVersion,
      lastSyncTime: Date.now(),
      items,
      range: isFullSync ? null : { start: startTimestamp!, end: Date.now() },
    });
    if (writeResult === "stale") {
      return retrySync(
        desktopUrl,
        isFullSync,
        onProgress,
        retryCount,
        "Desktop session cache changed during synchronization.",
      );
    }
    if (writeResult === "requires-full") {
      return retrySync(
        desktopUrl,
        true,
        onProgress,
        retryCount,
        "Desktop session metadata changed; performing a full synchronization.",
      );
    }

    await clearLegacySyncMetadata();
    onProgress?.(`Success! ${items.length} sessions synced.`);
    return items.length;
  } catch (error) {
    console.error("Log sync error:", error);
    throw new Error(extractErrMsg(error) || "Failed to sync logs");
  }
}

function retrySync(
  desktopUrl: string,
  isFullSync: boolean,
  onProgress: ((msg: string) => void) | undefined,
  retryCount: number,
  message: string,
): Promise<number> {
  if (retryCount >= MAX_SYNC_RETRIES) throw new Error(message);
  return syncDesktopLogs(desktopUrl, isFullSync, onProgress, retryCount + 1);
}

function getSessionSchemaVersion(value: unknown): number {
  if (value === undefined) return LEGACY_SESSION_SCHEMA_VERSION;
  if (
    !Number.isSafeInteger(value) ||
    (value !== LEGACY_SESSION_SCHEMA_VERSION &&
      value !== CURRENT_SESSION_SCHEMA_VERSION)
  ) {
    throw new Error("Desktop returned an unsupported session schema version.");
  }
  return value;
}

function validateSessionParticipants(
  sessions: DesktopSession[],
  schemaVersion: number,
): void {
  if (schemaVersion !== CURRENT_SESSION_SCHEMA_VERSION) return;
  for (const session of sessions) {
    for (const player of session.players) {
      if (typeof player.userId !== "string" || player.userId.length === 0) {
        throw new Error(
          "Desktop returned a version-2 session participant without a user ID.",
        );
      }
    }
  }
}

async function clearLegacySyncMetadata(): Promise<void> {
  try {
    await StorageWrapper.multiRemove(LEGACY_SYNC_METADATA_KEYS);
  } catch (error) {
    console.warn("Failed to clear legacy Desktop session sync metadata", error);
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  return (await sessionsRepo.getSyncSnapshot()).lastSyncTime;
}

export async function clearDesktopSessionData(): Promise<void> {
  await sessionsRepo.clearAllAndResetSyncState();
  await clearLegacySyncMetadata();
}
