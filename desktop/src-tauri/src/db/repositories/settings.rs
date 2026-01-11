use crate::db::schema::settings;
use sea_orm::*;

// 元のコードにあった WatcherState 定義
#[derive(Debug, Clone)]
pub struct WatcherState {
    pub log_path: String,
    pub is_running: bool,
    pub last_timestamp: String,
    pub last_position: u64,
}

pub struct SettingsRepository {
    db: DatabaseConnection,
}

impl SettingsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Generic getter
    pub async fn get_setting(&self, key: &str) -> Result<Option<String>, DbErr> {
        let res = settings::Entity::find_by_id(key).one(&self.db).await?;
        Ok(res.map(|m| m.value))
    }

    /// Generic setter (Upsert)
    pub async fn set_setting(&self, key: &str, value: &str) -> Result<(), DbErr> {
        let setting = settings::ActiveModel {
            key: Set(key.to_owned()),
            value: Set(value.to_owned()),
            ..Default::default()
        };

        settings::Entity::insert(setting)
            .on_conflict(
                sea_orm::sea_query::OnConflict::column(settings::Column::Key)
                    .update_column(settings::Column::Value)
                    .to_owned(),
            )
            .exec(&self.db)
            .await?;
        Ok(())
    }

    /// Save Watcher State
    pub async fn save_watcher_state(&self, state: &WatcherState) -> Result<(), DbErr> {
        // トランザクションで一括保存
        let txn = self.db.begin().await?;

        let items = vec![
            ("watcher_log_path", state.log_path.clone()),
            (
                "watcher_is_running",
                if state.is_running {
                    "1".to_string()
                } else {
                    "0".to_string()
                },
            ),
            ("watcher_last_timestamp", state.last_timestamp.clone()),
            ("watcher_last_position", state.last_position.to_string()),
        ];

        for (k, v) in items {
            let active_model = settings::ActiveModel {
                key: Set(k.to_string()),
                value: Set(v),
                ..Default::default()
            };

            settings::Entity::insert(active_model)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(settings::Column::Key)
                        .update_column(settings::Column::Value)
                        .to_owned(),
                )
                .exec(&txn)
                .await?;
        }

        txn.commit().await?;
        Ok(())
    }

    /// Get Watcher State
    pub async fn get_watcher_state(&self) -> Result<Option<WatcherState>, DbErr> {
        // 'watcher_%' に一致するキーを取得
        let rows = settings::Entity::find()
            .filter(settings::Column::Key.starts_with("watcher_"))
            .all(&self.db)
            .await?;

        let mut path = None;
        let mut is_running = false;
        let mut timestamp = None;
        let mut position = 0;

        for row in rows {
            match row.key.as_str() {
                "watcher_log_path" => path = Some(row.value),
                "watcher_is_running" => is_running = row.value == "1",
                "watcher_last_timestamp" => timestamp = Some(row.value),
                "watcher_last_position" => {
                    if let Ok(p) = row.value.parse::<u64>() {
                        position = p;
                    }
                }
                _ => {}
            }
        }

        if let (Some(p), Some(ts)) = (path, timestamp) {
            Ok(Some(WatcherState {
                log_path: p,
                is_running,
                last_timestamp: ts,
                last_position: position,
            }))
        } else {
            Ok(None)
        }
    }
}
