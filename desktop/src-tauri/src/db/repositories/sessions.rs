use crate::cmds::vrclog::sessions::{Interval, PlayerInterval, SessionPayload};
use crate::db::schema::{app_sessions, instance_sessions, logs, settings, user_sessions};
use crate::modules::watcher::{LogPayload, VrcLogEvent};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseConnection, DbErr,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set, TransactionTrait,
};
use std::collections::HashMap;

const PROJECTION_VERSION: &str = "1";
const PROJECTION_VERSION_KEY: &str = "session_projection_version";
const PROJECTION_STATUS_KEY: &str = "session_projection_status";
const PROJECTION_TIMESTAMP_KEY: &str = "session_projection_last_timestamp";
const PROJECTION_LOG_ID_KEY: &str = "session_projection_last_log_id";
const PROJECTION_LAST_ERROR_KEY: &str = "session_projection_last_error";
const CHUNK_SIZE: u64 = 500;

pub struct SessionsRepository {
    db: DatabaseConnection,
}

pub struct RecordLogResult {
    pub inserted: bool,
    pub rebuild_required: bool,
}

impl SessionsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn record_log(&self, payload: &LogPayload) -> Result<RecordLogResult, DbErr> {
        let txn = self.db.begin().await?;
        let inserted = insert_raw_log(&txn, payload).await?;
        let mut rebuild_required = false;
        let mut was_inserted = false;
        if let Some(log) = inserted {
            was_inserted = true;
            let version = get_setting(&txn, PROJECTION_VERSION_KEY).await?;
            let status = get_setting(&txn, PROJECTION_STATUS_KEY).await?;
            let last_timestamp = get_setting(&txn, PROJECTION_TIMESTAMP_KEY)
                .await?
                .and_then(|value| value.parse().ok())
                .unwrap_or(i64::MIN);
            let last_log_id = get_setting(&txn, PROJECTION_LOG_ID_KEY)
                .await?
                .and_then(|value| value.parse().ok())
                .unwrap_or(0);

            if version.as_deref() == Some(PROJECTION_VERSION)
                && status.as_deref() == Some("complete")
                && (log.timestamp, log.id) < (last_timestamp, last_log_id)
            {
                set_setting(&txn, PROJECTION_STATUS_KEY, "rebuild_required").await?;
                rebuild_required = true;
            } else {
                project_event(&txn, payload).await?;
                if version.as_deref() == Some(PROJECTION_VERSION)
                    && status.as_deref() == Some("complete")
                {
                    set_setting(&txn, PROJECTION_TIMESTAMP_KEY, &log.timestamp.to_string()).await?;
                    set_setting(&txn, PROJECTION_LOG_ID_KEY, &log.id.to_string()).await?;
                }
            }
        }
        txn.commit().await?;
        Ok(RecordLogResult {
            inserted: was_inserted,
            rebuild_required,
        })
    }

    pub async fn backfill(&self) -> Result<(), DbErr> {
        let version = get_setting(&self.db, PROJECTION_VERSION_KEY).await?;
        let status = get_setting(&self.db, PROJECTION_STATUS_KEY).await?;
        if version.as_deref() == Some(PROJECTION_VERSION) && status.as_deref() == Some("complete") {
            return Ok(());
        }

        let should_reset = version.as_deref() != Some(PROJECTION_VERSION)
            || !matches!(status.as_deref(), Some("running") | Some("failed"));
        if should_reset {
            let txn = self.db.begin().await?;
            clear_projection(&txn).await?;
            set_setting(&txn, PROJECTION_VERSION_KEY, PROJECTION_VERSION).await?;
            set_setting(&txn, PROJECTION_STATUS_KEY, "running").await?;
            set_setting(&txn, PROJECTION_TIMESTAMP_KEY, &i64::MIN.to_string()).await?;
            set_setting(&txn, PROJECTION_LOG_ID_KEY, "0").await?;
            set_setting(&txn, PROJECTION_LAST_ERROR_KEY, "").await?;
            txn.commit().await?;
        }

        let mut last_timestamp = get_setting(&self.db, PROJECTION_TIMESTAMP_KEY)
            .await?
            .and_then(|value| value.parse().ok())
            .unwrap_or(i64::MIN);
        let mut last_log_id = get_setting(&self.db, PROJECTION_LOG_ID_KEY)
            .await?
            .and_then(|value| value.parse().ok())
            .unwrap_or(0);

        loop {
            let rows = logs::Entity::find()
                .filter(
                    Condition::any()
                        .add(logs::Column::Timestamp.gt(last_timestamp))
                        .add(
                            Condition::all()
                                .add(logs::Column::Timestamp.eq(last_timestamp))
                                .add(logs::Column::Id.gt(last_log_id)),
                        ),
                )
                .order_by_asc(logs::Column::Timestamp)
                .order_by_asc(logs::Column::Id)
                .limit(CHUNK_SIZE)
                .all(&self.db)
                .await?;
            if rows.is_empty() {
                break;
            }

            let txn = self.db.begin().await?;
            for row in &rows {
                match serde_json::from_str(&row.data) {
                    Ok(event) => {
                        project_event(
                            &txn,
                            &LogPayload {
                                event,
                                timestamp: row.timestamp,
                                hash: row.hash,
                            },
                        )
                        .await?;
                    }
                    Err(error) => {
                        set_setting(
                            &txn,
                            PROJECTION_LAST_ERROR_KEY,
                            &format!("Skipped invalid log {}: {error}", row.id),
                        )
                        .await?;
                    }
                }
            }
            let last = rows.last().expect("rows is not empty");
            last_timestamp = last.timestamp;
            last_log_id = last.id;
            set_setting(&txn, PROJECTION_TIMESTAMP_KEY, &last_timestamp.to_string()).await?;
            set_setting(&txn, PROJECTION_LOG_ID_KEY, &last_log_id.to_string()).await?;
            txn.commit().await?;
        }

        set_setting(&self.db, PROJECTION_STATUS_KEY, "complete").await
    }

    pub async fn delete_all(&self) -> Result<(), DbErr> {
        let txn = self.db.begin().await?;
        user_sessions::Entity::delete_many().exec(&txn).await?;
        instance_sessions::Entity::delete_many().exec(&txn).await?;
        app_sessions::Entity::delete_many().exec(&txn).await?;
        logs::Entity::delete_many().exec(&txn).await?;
        settings::Entity::delete_many()
            .filter(settings::Column::Key.starts_with("session_projection_"))
            .exec(&txn)
            .await?;
        txn.commit().await
    }

    pub async fn get_sessions(
        &self,
        start: Option<i64>,
        end: Option<i64>,
    ) -> Result<Vec<SessionPayload>, DbErr> {
        let requested_start = start.unwrap_or(i64::MIN);
        let requested_end = end.unwrap_or(i64::MAX);
        if requested_start > requested_end {
            return Err(DbErr::Custom(
                "Session range start must not exceed end".to_string(),
            ));
        }

        let sessions = instance_sessions::Entity::find()
            .filter(instance_sessions::Column::StartTime.lte(requested_end))
            .filter(
                Condition::any()
                    .add(instance_sessions::Column::EndTime.gte(requested_start))
                    .add(
                        Condition::all()
                            .add(instance_sessions::Column::EndTime.is_null())
                            .add(instance_sessions::Column::LastEventTime.gte(requested_start)),
                    ),
            )
            .order_by_asc(instance_sessions::Column::StartTime)
            .order_by_asc(instance_sessions::Column::Id)
            .all(&self.db)
            .await?;
        if sessions.is_empty() {
            return Ok(Vec::new());
        }

        let app_ids = sessions
            .iter()
            .map(|session| session.app_session_id)
            .collect::<Vec<_>>();
        let apps = app_sessions::Entity::find()
            .filter(app_sessions::Column::Id.is_in(app_ids))
            .all(&self.db)
            .await?
            .into_iter()
            .map(|app| (app.id, app))
            .collect::<HashMap<_, _>>();
        let instance_ids = sessions
            .iter()
            .map(|session| session.id)
            .collect::<Vec<_>>();
        let mut users_by_instance = HashMap::<i32, Vec<user_sessions::Model>>::new();
        for user in user_sessions::Entity::find()
            .filter(user_sessions::Column::InstanceSessionId.is_in(instance_ids))
            .order_by_asc(user_sessions::Column::InstanceSessionId)
            .order_by_asc(user_sessions::Column::JoinTime)
            .order_by_asc(user_sessions::Column::Id)
            .all(&self.db)
            .await?
        {
            users_by_instance
                .entry(user.instance_session_id)
                .or_default()
                .push(user);
        }

        let mut payloads = Vec::with_capacity(sessions.len());
        for session in sessions {
            let app = apps
                .get(&session.app_session_id)
                .ok_or_else(|| DbErr::Custom("Missing parent app session".to_string()))?;
            let mut start_time = session.start_time;
            let mut end_time = session
                .end_time
                .unwrap_or(session.last_event_time)
                .max(start_time);
            let mut players: HashMap<String, PlayerAccumulator> = HashMap::new();
            let mut self_intervals = Vec::new();

            for user in users_by_instance.remove(&session.id).unwrap_or_default() {
                let interval = Interval {
                    start: user.join_time,
                    end: user.leave_time.unwrap_or(end_time).max(user.join_time),
                };
                if app.user_id.as_deref() == Some(user.user_id.as_str()) {
                    self_intervals.push(interval);
                    continue;
                }
                let entry = players
                    .entry(user.user_id)
                    .or_insert_with(|| PlayerAccumulator {
                        name: user.display_name.clone(),
                        intervals: Vec::new(),
                    });
                entry.name = user.display_name;
                entry.intervals.push(interval);
            }

            if let Some(first) = self_intervals.first() {
                start_time = first.start;
            }
            if let Some(last) = self_intervals.last() {
                end_time = last.end.max(start_time);
            }

            let mut player_payloads = players
                .into_values()
                .map(|player| PlayerInterval {
                    total_duration_ms: player.intervals.iter().map(|i| i.end - i.start).sum(),
                    name: player.name,
                    intervals: player.intervals,
                })
                .collect::<Vec<_>>();
            player_payloads
                .sort_by(|left, right| right.total_duration_ms.cmp(&left.total_duration_ms));

            payloads.push(SessionPayload {
                world_name: session.world_name,
                instance_id: session.instance_id,
                start_time,
                end_time,
                duration_ms: end_time - start_time,
                username: app.username.clone(),
                players: player_payloads,
            });
        }
        Ok(payloads)
    }
}

struct PlayerAccumulator {
    name: String,
    intervals: Vec<Interval>,
}

async fn insert_raw_log<C: ConnectionTrait>(
    db: &C,
    payload: &LogPayload,
) -> Result<Option<logs::Model>, DbErr> {
    let event_type = match payload.event {
        VrcLogEvent::AppStart => "AppStart",
        VrcLogEvent::AppStop => "AppStop",
        VrcLogEvent::InvalidAppStop => "InvalidAppStop",
        VrcLogEvent::Login { .. } => "Login",
        VrcLogEvent::WorldEnter { .. } => "WorldEnter",
        VrcLogEvent::InstanceJoin { .. } => "InstanceJoin",
        VrcLogEvent::PlayerJoin { .. } => "PlayerJoin",
        VrcLogEvent::PlayerLeft { .. } => "PlayerLeft",
        VrcLogEvent::SelfLeft => "SelfLeft",
    };
    let data =
        serde_json::to_string(&payload.event).map_err(|error| DbErr::Custom(error.to_string()))?;
    let result = logs::Entity::insert(logs::ActiveModel {
        timestamp: Set(payload.timestamp),
        event_type: Set(event_type.to_string()),
        data: Set(data),
        hash: Set(payload.hash),
        ..Default::default()
    })
    .on_conflict(
        sea_orm::sea_query::OnConflict::column(logs::Column::Hash)
            .do_nothing()
            .to_owned(),
    )
    .exec_without_returning(db)
    .await?;
    if result == 0 {
        return Ok(None);
    }

    logs::Entity::find()
        .filter(logs::Column::Hash.eq(payload.hash))
        .one(db)
        .await
}

async fn project_event<C: ConnectionTrait>(db: &C, payload: &LogPayload) -> Result<(), DbErr> {
    match &payload.event {
        VrcLogEvent::AppStart => {
            if let Some(app) = active_app(db).await? {
                let end_time = app.last_event_time.max(app.start_time);
                close_app(db, app, end_time, false).await?;
            }
            app_sessions::ActiveModel {
                start_time: Set(payload.timestamp),
                end_time: Set(None),
                last_event_time: Set(payload.timestamp),
                is_graceful: Set(None),
                user_id: Set(None),
                username: Set(None),
                pending_world_name: Set(None),
                ..Default::default()
            }
            .insert(db)
            .await?;
        }
        VrcLogEvent::AppStop => {
            if let Some(app) = active_app(db).await? {
                close_app(db, app, payload.timestamp, true).await?;
            }
        }
        VrcLogEvent::InvalidAppStop => {
            if let Some(app) = active_app(db).await? {
                close_app(db, app, payload.timestamp, false).await?;
            }
        }
        VrcLogEvent::Login { username, user_id } => {
            if let Some(app) = touch_active_app(db, payload.timestamp).await? {
                let mut active: app_sessions::ActiveModel = app.into();
                active.user_id = Set(Some(user_id.clone()));
                active.username = Set(Some(username.clone()));
                active.update(db).await?;
                touch_active_instance(db, payload.timestamp).await?;
            }
        }
        VrcLogEvent::WorldEnter { world_name } => {
            if let Some(app) = touch_active_app(db, payload.timestamp).await? {
                let mut active: app_sessions::ActiveModel = app.into();
                active.pending_world_name = Set(Some(world_name.clone()));
                active.update(db).await?;
                touch_active_instance(db, payload.timestamp).await?;
            }
        }
        VrcLogEvent::InstanceJoin { instance_id, .. } => {
            if let Some(app) = touch_active_app(db, payload.timestamp).await? {
                if let Some(instance) = active_instance(db, app.id).await? {
                    close_instance(db, instance, payload.timestamp, true).await?;
                }
                let world_name = app
                    .pending_world_name
                    .clone()
                    .unwrap_or_else(|| "Unknown World".to_string());
                let app_id = app.id;
                let mut active: app_sessions::ActiveModel = app.into();
                active.pending_world_name = Set(None);
                active.update(db).await?;
                instance_sessions::ActiveModel {
                    app_session_id: Set(app_id),
                    world_name: Set(world_name),
                    instance_id: Set(instance_id.clone()),
                    start_time: Set(payload.timestamp),
                    end_time: Set(None),
                    last_event_time: Set(payload.timestamp),
                    is_graceful: Set(None),
                    ..Default::default()
                }
                .insert(db)
                .await?;
            }
        }
        VrcLogEvent::PlayerJoin {
            player_name,
            user_id,
        } => {
            if let Some(app) = touch_active_app(db, payload.timestamp).await? {
                if let Some(instance) = active_instance(db, app.id).await? {
                    touch_instance(db, instance.clone(), payload.timestamp).await?;
                    if let Some(user) = user_sessions::Entity::find()
                        .filter(user_sessions::Column::InstanceSessionId.eq(instance.id))
                        .filter(user_sessions::Column::UserId.eq(user_id))
                        .filter(user_sessions::Column::LeaveTime.is_null())
                        .order_by_desc(user_sessions::Column::Id)
                        .one(db)
                        .await?
                    {
                        let mut active: user_sessions::ActiveModel = user.into();
                        active.display_name = Set(player_name.clone());
                        active.update(db).await?;
                    } else {
                        user_sessions::ActiveModel {
                            instance_session_id: Set(instance.id),
                            user_id: Set(user_id.clone()),
                            display_name: Set(player_name.clone()),
                            join_time: Set(payload.timestamp),
                            leave_time: Set(None),
                            ..Default::default()
                        }
                        .insert(db)
                        .await?;
                    }
                }
            }
        }
        VrcLogEvent::PlayerLeft { user_id, .. } => {
            if let Some(app) = touch_active_app(db, payload.timestamp).await? {
                if let Some(instance) = active_instance(db, app.id).await? {
                    touch_instance(db, instance.clone(), payload.timestamp).await?;
                    if let Some(user) = user_sessions::Entity::find()
                        .filter(user_sessions::Column::InstanceSessionId.eq(instance.id))
                        .filter(user_sessions::Column::UserId.eq(user_id))
                        .filter(user_sessions::Column::LeaveTime.is_null())
                        .order_by_desc(user_sessions::Column::Id)
                        .one(db)
                        .await?
                    {
                        close_user(db, user, payload.timestamp).await?;
                    }
                }
            }
        }
        VrcLogEvent::SelfLeft => {}
    }
    Ok(())
}

async fn active_app<C: ConnectionTrait>(db: &C) -> Result<Option<app_sessions::Model>, DbErr> {
    app_sessions::Entity::find()
        .filter(app_sessions::Column::EndTime.is_null())
        .order_by_desc(app_sessions::Column::Id)
        .one(db)
        .await
}

async fn active_instance<C: ConnectionTrait>(
    db: &C,
    app_session_id: i32,
) -> Result<Option<instance_sessions::Model>, DbErr> {
    instance_sessions::Entity::find()
        .filter(instance_sessions::Column::AppSessionId.eq(app_session_id))
        .filter(instance_sessions::Column::EndTime.is_null())
        .order_by_desc(instance_sessions::Column::Id)
        .one(db)
        .await
}

async fn touch_active_app<C: ConnectionTrait>(
    db: &C,
    timestamp: i64,
) -> Result<Option<app_sessions::Model>, DbErr> {
    let Some(app) = active_app(db).await? else {
        return Ok(None);
    };
    let last_event_time = app.last_event_time.max(timestamp);
    let mut active: app_sessions::ActiveModel = app.into();
    active.last_event_time = Set(last_event_time);
    active.update(db).await.map(Some)
}

async fn touch_active_instance<C: ConnectionTrait>(db: &C, timestamp: i64) -> Result<(), DbErr> {
    if let Some(app) = active_app(db).await? {
        if let Some(instance) = active_instance(db, app.id).await? {
            touch_instance(db, instance, timestamp).await?;
        }
    }
    Ok(())
}

async fn touch_instance<C: ConnectionTrait>(
    db: &C,
    instance: instance_sessions::Model,
    timestamp: i64,
) -> Result<(), DbErr> {
    let last_event_time = instance.last_event_time.max(timestamp);
    let mut active: instance_sessions::ActiveModel = instance.into();
    active.last_event_time = Set(last_event_time);
    active.update(db).await?;
    Ok(())
}

async fn close_app<C: ConnectionTrait>(
    db: &C,
    app: app_sessions::Model,
    end_time: i64,
    is_graceful: bool,
) -> Result<(), DbErr> {
    let end_time = end_time.max(app.start_time);
    if let Some(instance) = active_instance(db, app.id).await? {
        close_instance(db, instance, end_time, is_graceful).await?;
    }
    let last_event_time = app.last_event_time.max(end_time);
    let mut active: app_sessions::ActiveModel = app.into();
    active.end_time = Set(Some(end_time));
    active.last_event_time = Set(last_event_time);
    active.is_graceful = Set(Some(is_graceful));
    active.update(db).await?;
    Ok(())
}

async fn close_instance<C: ConnectionTrait>(
    db: &C,
    instance: instance_sessions::Model,
    end_time: i64,
    is_graceful: bool,
) -> Result<(), DbErr> {
    let end_time = end_time.max(instance.start_time);
    let users = user_sessions::Entity::find()
        .filter(user_sessions::Column::InstanceSessionId.eq(instance.id))
        .filter(user_sessions::Column::LeaveTime.is_null())
        .all(db)
        .await?;
    for user in users {
        close_user(db, user, end_time).await?;
    }
    let last_event_time = instance.last_event_time.max(end_time);
    let mut active: instance_sessions::ActiveModel = instance.into();
    active.end_time = Set(Some(end_time));
    active.last_event_time = Set(last_event_time);
    active.is_graceful = Set(Some(is_graceful));
    active.update(db).await?;
    Ok(())
}

async fn close_user<C: ConnectionTrait>(
    db: &C,
    user: user_sessions::Model,
    end_time: i64,
) -> Result<(), DbErr> {
    let leave_time = end_time.max(user.join_time);
    let mut active: user_sessions::ActiveModel = user.into();
    active.leave_time = Set(Some(leave_time));
    active.update(db).await?;
    Ok(())
}

async fn clear_projection<C: ConnectionTrait>(db: &C) -> Result<(), DbErr> {
    user_sessions::Entity::delete_many().exec(db).await?;
    instance_sessions::Entity::delete_many().exec(db).await?;
    app_sessions::Entity::delete_many().exec(db).await?;
    Ok(())
}

async fn get_setting<C: ConnectionTrait>(db: &C, key: &str) -> Result<Option<String>, DbErr> {
    settings::Entity::find_by_id(key)
        .one(db)
        .await
        .map(|value| value.map(|row| row.value))
}

async fn set_setting<C: ConnectionTrait>(db: &C, key: &str, value: &str) -> Result<(), DbErr> {
    settings::Entity::insert(settings::ActiveModel {
        key: Set(key.to_string()),
        value: Set(value.to_string()),
    })
    .on_conflict(
        sea_orm::sea_query::OnConflict::column(settings::Column::Key)
            .update_column(settings::Column::Value)
            .to_owned(),
    )
    .exec_without_returning(db)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DB;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_database_path(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time is valid")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "vrcp-session-{name}-{}-{nonce}",
            std::process::id()
        ))
    }

    fn payload(event: VrcLogEvent, timestamp: i64, hash: i64) -> LogPayload {
        LogPayload {
            event,
            timestamp,
            hash,
        }
    }

    #[tokio::test]
    async fn projects_a_graceful_session_into_the_existing_payload_shape() {
        let path = temporary_database_path("graceful");
        let db = DB::new(path.clone()).await.expect("database opens");
        let events = vec![
            payload(VrcLogEvent::AppStart, 100, 1),
            payload(
                VrcLogEvent::Login {
                    username: "Me".to_string(),
                    user_id: "usr_me".to_string(),
                },
                110,
                2,
            ),
            payload(
                VrcLogEvent::WorldEnter {
                    world_name: "Test World".to_string(),
                },
                120,
                3,
            ),
            payload(
                VrcLogEvent::InstanceJoin {
                    world_id: "wrld_test".to_string(),
                    instance_id: "wrld_test:1".to_string(),
                },
                130,
                4,
            ),
            payload(
                VrcLogEvent::PlayerJoin {
                    player_name: "Me".to_string(),
                    user_id: "usr_me".to_string(),
                },
                130,
                5,
            ),
            payload(
                VrcLogEvent::PlayerJoin {
                    player_name: "Friend".to_string(),
                    user_id: "usr_friend".to_string(),
                },
                140,
                6,
            ),
            payload(
                VrcLogEvent::PlayerLeft {
                    player_name: "Friend".to_string(),
                    user_id: "usr_friend".to_string(),
                },
                150,
                7,
            ),
            payload(VrcLogEvent::AppStop, 160, 8),
        ];

        for event in events {
            db.record_log(&event).await.expect("event is recorded");
        }

        let sessions = db
            .get_sessions(Some(0), Some(200))
            .await
            .expect("sessions load");
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].world_name, "Test World");
        assert_eq!(sessions[0].instance_id, "wrld_test:1");
        assert_eq!(sessions[0].start_time, 130);
        assert_eq!(sessions[0].end_time, 160);
        assert_eq!(sessions[0].username.as_deref(), Some("Me"));
        assert_eq!(sessions[0].players.len(), 1);
        assert_eq!(sessions[0].players[0].name, "Friend");
        assert_eq!(sessions[0].players[0].total_duration_ms, 10);

        let app = app_sessions::Entity::find()
            .one(&db.connection)
            .await
            .expect("app session loads")
            .expect("app session exists");
        assert_eq!(app.is_graceful, Some(true));

        drop(db);
        std::fs::remove_dir_all(path).expect("temporary database is removed");
    }

    #[tokio::test]
    async fn backfills_legacy_invalid_app_stop_as_an_ungraceful_session() {
        let path = temporary_database_path("legacy");
        let db = DB::new(path.clone()).await.expect("database opens");
        let events = vec![
            payload(VrcLogEvent::AppStart, 100, 11),
            payload(
                VrcLogEvent::WorldEnter {
                    world_name: "Legacy World".to_string(),
                },
                110,
                12,
            ),
            payload(
                VrcLogEvent::InstanceJoin {
                    world_id: "wrld_legacy".to_string(),
                    instance_id: "wrld_legacy:1".to_string(),
                },
                120,
                13,
            ),
            payload(VrcLogEvent::InvalidAppStop, 130, 14),
        ];

        for event in events {
            db.logs()
                .insert_log(&event)
                .await
                .expect("legacy log is inserted");
        }
        db.backfill_sessions()
            .await
            .expect("legacy logs are backfilled");

        let sessions = db
            .get_sessions(Some(0), Some(200))
            .await
            .expect("sessions load");
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].end_time, 130);

        let app = app_sessions::Entity::find()
            .one(&db.connection)
            .await
            .expect("app session loads")
            .expect("app session exists");
        assert_eq!(app.is_graceful, Some(false));

        drop(db);
        std::fs::remove_dir_all(path).expect("temporary database is removed");
    }

    #[tokio::test]
    async fn skips_corrupt_legacy_logs_and_completes_the_backfill() {
        let path = temporary_database_path("corrupt-log");
        let db = DB::new(path.clone()).await.expect("database opens");
        logs::Entity::insert(logs::ActiveModel {
            timestamp: Set(100),
            event_type: Set("Unknown".to_string()),
            data: Set("not valid JSON".to_string()),
            hash: Set(100),
            ..Default::default()
        })
        .exec(&db.connection)
        .await
        .expect("corrupt legacy log is inserted");
        for event in [
            payload(VrcLogEvent::AppStart, 110, 101),
            payload(
                VrcLogEvent::WorldEnter {
                    world_name: "Recovered World".to_string(),
                },
                120,
                102,
            ),
            payload(
                VrcLogEvent::InstanceJoin {
                    world_id: "wrld_recovered".to_string(),
                    instance_id: "wrld_recovered:1".to_string(),
                },
                130,
                103,
            ),
            payload(VrcLogEvent::AppStop, 140, 104),
        ] {
            db.logs()
                .insert_log(&event)
                .await
                .expect("legacy log is inserted");
        }

        db.backfill_sessions()
            .await
            .expect("backfill skips corrupt logs");

        let sessions = db
            .get_sessions(Some(0), Some(200))
            .await
            .expect("sessions load");
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].world_name, "Recovered World");
        let error = get_setting(&db.connection, PROJECTION_LAST_ERROR_KEY)
            .await
            .expect("projection error setting loads")
            .expect("projection error is recorded");
        assert!(error.starts_with("Skipped invalid log"));

        drop(db);
        std::fs::remove_dir_all(path).expect("temporary database is removed");
    }
}
