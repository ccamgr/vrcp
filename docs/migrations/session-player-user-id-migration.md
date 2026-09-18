# Session Participant User ID Migration Design

## Objective

Preserve each participant's VRChat `userId` from the Desktop session projection through the Desktop session APIs and the Mobile SQLite cache. This establishes a stable participant identity for a future co-presence ranking feature.

This change does not implement rankings, modify the analytics UI, or infer friendship from display names.

## Current State and Problem

Desktop already persists a stable identifier in `user_sessions.user_id`. When a session is returned, `SessionsRepository::get_sessions_page()` groups intervals by that ID, but `PlayerInterval` contains only the final display name, intervals, and total duration. The identifier is therefore lost before both the Tauri command and `GET /sessions` response.

Mobile stores the `/sessions` response in the `sessions.players` JSON column. Its `SessionPlayer` type also has only `name`, `intervals`, and `totalDurationMs`. Display names are neither unique nor immutable, so they must not be used to determine a friend ranking.

## Scope

### In scope

| Area | Files / contract | Change |
| --- | --- | --- |
| Desktop projection output | `desktop/src-tauri/src/cmds/vrclog/sessions.rs`, `desktop/src-tauri/src/db/repositories/sessions.rs` | Add `user_id` to the Rust `PlayerInterval` and populate it from the map key already used to group `user_sessions`. Serialize it as `userId`. |
| Desktop Tauri API | `get_sessions`, generated `desktop/src/generated/bindings.ts` | Regenerate bindings after the Rust type changes. Desktop UI behavior remains unchanged. |
| Desktop LAN API | `desktop/src-tauri/src/modules/http.rs`, `GET /sessions` | Include `userId` in every participant and add a page-level `schemaVersion: 2`. |
| Mobile LAN API client | `mobile/src/lib/desktopApi.ts` | Model `userId` and the page-level schema version, while accepting a missing field from an older Desktop. |
| Mobile session cache | `mobile/src/db/schema/sessions.ts`, `mobile/src/db/schema/sessionSyncState.ts`, `mobile/src/db/repogitories/sessions.ts`, `mobile/src/lib/funcs/syncDesktopLogs.ts`, `mobile/src/hooks/useLogManager.ts` | Preserve `userId` in the existing JSON `players` column. Store synchronization state in SQLite and use a revision check so foreground sync, background sync, and local deletion cannot overwrite each other. |
| Verification | Desktop repository / HTTP tests and Mobile sync tests | Cover identifier preservation, compatibility, and cache replacement behavior. |

### Out of scope

- Ranking calculation, ranking screens, date-range UI, or friend-list matching.
- A new column on `sessions`. `players` is already a JSON column; adding an optional JSON member does not require a table migration. A separate `session_sync_state` table and Drizzle migration are required for synchronization atomicity.
- Rewriting Desktop `user_sessions` records or raw logs. They already retain the required ID.
- Preserving or converting pre-release Mobile raw-log data. The migration drops the obsolete `logs` table; users can choose **Full Sync** in Mobile settings to replace all Mobile sessions from Desktop.
- LAN API authentication policy changes. See the security consideration below.

## API and Data Contract

### Participant object

The Desktop output type becomes the following JSON shape.

```ts
interface PlayerInterval {
  userId: string;
  name: string;
  intervals: Array<{ start: number; end: number }>;
  totalDurationMs: number;
}
```

`userId` is required in output from the updated Desktop because `user_sessions.user_id` is non-null. It is the identifier that groups intervals; a later display-name change updates `name` only and must not merge distinct users.

The existing `SessionPayload` fields and `GET /sessions` pagination cursor remain unchanged. Both the Tauri `get_sessions` command and the LAN endpoint serialize the same `PlayerInterval` type, preventing the two interfaces from drifting.

### Session page version

`GET /sessions` adds a top-level, constant field.

```ts
interface DesktopSessionPage {
  schemaVersion: 2;
  sessions: DesktopSession[];
  nextCursor: string | null;
  generation: number;
  source: string;
}
```

`generation` represents source-data rebuilds and can remain unchanged when only the serialized shape changes. `schemaVersion` is therefore separate: it tells Mobile that every cached row must be fetched again to populate IDs. The version is included on every page; Mobile must reject a multi-page response if it changes during one synchronization.

### Mobile compatibility model

Mobile accepts old Desktop servers during a staged rollout.

```ts
interface SessionPlayer {
  userId?: string;
  name: string;
  intervals: SessionInterval[];
  totalDurationMs: number;
}
```

The optional field is only for already-stored data and responses from a Desktop that predates schema version 2. New schema-version-2 responses must contain a non-empty `userId`; Mobile validates this before writing rows. A future ranking must exclude entries without `userId` rather than falling back to a display-name comparison.

## Synchronization and Cache Migration

Mobile stores synchronization metadata in a singleton `session_sync_state` SQLite row. The row has `revision`, `source`, `generation`, `schema_version`, and `last_sync_time`. `revision` changes after every successful write and after local deletion.

1. Read the SQLite state and retain its revision before fetching.
2. Treat an omitted `schemaVersion` from an older Desktop as version 1. Continue the existing sync behavior and store `1`; existing history remains available but has no stable participant IDs.
3. Require a single schema version across all fetched pages.
4. In an SQLite `IMMEDIATE` transaction, reload the state and compare its revision with the retained value. A mismatch means another foreground/background sync or deletion completed first, so discard the fetched pages and retry.
5. When source, generation, or schema version differs from the reloaded state, discard a range response and retry as a full sync.
6. In the same transaction, replace the applicable sessions and update all metadata with an incremented revision.

The local Desktop-log clear action deletes `sessions` and resets `session_sync_state` with an incremented revision in the same transaction. A synchronization that began earlier observes the revision mismatch before writing, so its already-fetched response cannot restore rows after the delete. A later retry fetches a fresh response and is handled as a normal new synchronization. The former AsyncStorage keys (`DESKTOP_LOG_LAST_SYNC_TIME`, `DESKTOP_SESSION_SOURCE`, `DESKTOP_SESSION_GENERATION`, and `DESKTOP_SESSION_SCHEMA_VERSION`) are no longer read; they are removed on successful sync or deletion as best-effort cleanup.

The first synchronization from an upgraded Mobile to an upgraded Desktop therefore replaces all cached sessions with version-2 data. This is required because the normal seven-day lookback would leave older cached sessions without IDs. A failed full sync must leave the existing cache and its metadata intact because the replacement and state update share one SQLite transaction.

The migration drops the obsolete Mobile `logs` table without converting it. The removal is idempotent because earlier pre-release builds may already have removed the table. This is intentional while the app is pre-release: users who need history select **Full Sync** in Mobile Desktop settings, which replaces the local `sessions` cache with all data returned by Desktop.

For a newly installed Mobile, a full sync already follows the existing flow. For an updated Mobile connected to an older Desktop, the app continues to show history normally; the later ranking feature can show that stable participant data is unavailable until the Desktop is updated and synchronized.

## Implementation Sequence

1. Add `user_id: String` with `#[serde(rename = "userId")]` to Desktop `PlayerInterval`.
2. Keep `HashMap<String, PlayerAccumulator>` keyed by `user_id`; extend `PlayerAccumulator` to retain that key or map `(user_id, accumulator)` into `PlayerInterval` when constructing the payload.
3. Add `schema_version: u32` with `#[serde(rename = "schemaVersion")]` to the HTTP `SessionPage` and return `2` from `GET /sessions`.
4. Regenerate Desktop bindings with `make gen-bindings`; do not edit generated bindings manually.
5. Add `userId?: string` and `schemaVersion?: number` to the Mobile transport/cache types.
6. Add the `session_sync_state` schema and generate its Drizzle migration.
7. Update `syncDesktopLogs()` to validate version-2 participants, compare the persisted revision before writing, and perform the full replacement described above.
8. Make local Desktop-log deletion reset sessions and state in one SQLite transaction.
9. Add focused tests, then run Desktop binding generation, Mobile TypeScript checking, and the project diff check.

## Error Handling

- A non-numeric, unsupported, or page-inconsistent schema version fails the sync before any SQLite write.
- A version-2 participant without a non-empty `userId` fails the sync before any SQLite write; this catches a partially upgraded or malformed Desktop response.
- A missing version is version 1 only for backward compatibility. It must never be assumed to contain IDs.
- A stale revision or a changing Desktop source/generation retries from a fresh state. Retries are bounded; failure leaves both cached sessions and the persisted state untouched.
- Mobile does not delete legacy sessions merely because a Desktop is still on version 1.

## Security and Privacy

The Desktop database and raw VRChat logs already hold player IDs. This change additionally exposes those stable IDs through the existing LAN `GET /sessions` response, which increases how easily a network client can correlate session participants across display-name changes.

LAN API authentication is explicitly outside this migration to avoid coupling it to a data-shape change. Before exposing session-derived social analytics beyond the trusted local network use case, the existing LAN API authentication task must be revisited. The Mobile app must keep this data local and must not send participant IDs to third-party services.

## Verification Plan

1. Desktop repository test: two distinct `user_id` values with the same display name yield two participants with separate IDs and intervals.
2. Desktop repository test: one `user_id` with a changed display name remains one participant and uses the latest display name, preserving existing behavior.
3. Desktop HTTP test: a `/sessions` page returns `schemaVersion: 2` and every participant contains `userId`.
4. Desktop command test / binding generation: generated `PlayerInterval` contains `userId` and Desktop analytics still type-checks without UI changes.
5. Mobile sync test: version-2 data is stored in the JSON `players` field with IDs intact.
6. Mobile sync test: changing saved schema version from 1 to 2 triggers exactly one full synchronization and replaces, rather than mixes, legacy rows.
7. Mobile sync test: deleting local Desktop logs increments the SQLite state revision, and an already-fetched sync cannot write sessions or metadata afterward.
8. Mobile sync test: two concurrent syncs allow only the one with the current revision to save; the other retries from fresh state.
9. Mobile sync test: an old response without `schemaVersion` and `userId` remains readable and does not crash history views.
10. Mobile sync test: malformed version-2 data fails without changing sessions or sync metadata.
