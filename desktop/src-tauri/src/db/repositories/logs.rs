use crate::db::schema::logs;
use crate::modules::watcher::{LogPayload, VrcLogEvent};
use sea_orm::*;

pub struct LogsRepository {
    db: DatabaseConnection,
}

impl LogsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn insert_log(&self, payload: &LogPayload) -> Result<i32, DbErr> {
        let event_type_str = format!("{:?}", payload.event)
            .split_whitespace()
            .next()
            .unwrap_or("Unknown")
            .to_string()
            .replace(" {", "")
            .replace("}", "");

        let data_json =
            serde_json::to_string(&payload.event).map_err(|e| DbErr::Custom(e.to_string()))?;

        let new_log = logs::ActiveModel {
            // Directly insert the i64 timestamp
            timestamp: Set(payload.timestamp),
            event_type: Set(event_type_str),
            data: Set(data_json),
            hash: Set(payload.hash),
            ..Default::default()
        };

        let res = logs::Entity::insert(new_log)
            .on_conflict(
                sea_orm::sea_query::OnConflict::column(logs::Column::Hash)
                    .do_nothing()
                    .to_owned(),
            )
            .exec(&self.db)
            .await;

        match res {
            Ok(res) => Ok(res.last_insert_id),
            Err(e) => Err(e),
        }
    }

    pub async fn get_session_expanded_logs(
        &self,
        start_timestamp: Option<&i64>,
        end_timestamp: Option<&i64>,
    ) -> Result<Vec<LogPayload>, DbErr> {
        // Parse frontend date strings into i64. Use 0 and far-future defaults if None.
        let start = start_timestamp.copied().unwrap_or(0);
        let end = end_timestamp.copied().unwrap_or(253402300799000); // approx 9999-12-31

        // Use direct integer math (86400000 ms = 24 hours) instead of SQLite datetime()
        let sql = r#"
            SELECT *
            FROM logs
            WHERE timestamp >= (
                SELECT COALESCE(
                    (SELECT timestamp FROM logs
                     WHERE timestamp < ?
                       AND timestamp > ? - 86400000
                       AND event_type = 'AppStart'
                     ORDER BY timestamp DESC LIMIT 1),
                    ?
                )
            )
            AND timestamp <= (
                SELECT COALESCE(
                    (SELECT timestamp FROM logs
                     WHERE timestamp > ?
                       AND timestamp < ? + 86400000
                       AND event_type IN ('AppStop', 'InvalidAppStop')
                     ORDER BY timestamp ASC LIMIT 1),
                    ?
                )
            )
            ORDER BY timestamp ASC, id ASC
        "#;

        let query_res = logs::Entity::find()
            .from_raw_sql(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                sql,
                vec![
                    start.into(),
                    start.into(),
                    start.into(),
                    end.into(),
                    end.into(),
                    end.into(),
                ],
            ))
            .all(&self.db)
            .await?;

        let mut payloads = Vec::new();
        for row in query_res {
            let event: VrcLogEvent = serde_json::from_str(&row.data)
                .map_err(|e| DbErr::Custom(format!("JSON Parse Error: {}", e)))?;

            payloads.push(LogPayload {
                event,
                // Assign i64 directly from the entity model
                timestamp: row.timestamp,
                hash: row.hash,
            });
        }

        Ok(payloads)
    }

    pub async fn get_logs_page(
        &self,
        start_timestamp: Option<i64>,
        end_timestamp: Option<i64>,
        cursor: Option<(i64, i32)>,
        limit: u64,
    ) -> Result<(Vec<LogPayload>, Option<(i64, i32)>), DbErr> {
        let start = start_timestamp.unwrap_or(i64::MIN);
        let end = end_timestamp.unwrap_or(i64::MAX);
        let mut query = logs::Entity::find()
            .filter(logs::Column::Timestamp.gte(start))
            .filter(logs::Column::Timestamp.lte(end));
        if let Some((timestamp, id)) = cursor {
            query = query.filter(
                Condition::any()
                    .add(logs::Column::Timestamp.gt(timestamp))
                    .add(
                        Condition::all()
                            .add(logs::Column::Timestamp.eq(timestamp))
                            .add(logs::Column::Id.gt(id)),
                    ),
            );
        }
        let mut rows = query
            .order_by_asc(logs::Column::Timestamp)
            .order_by_asc(logs::Column::Id)
            .limit(limit + 1)
            .all(&self.db)
            .await?;
        let has_next_page = rows.len() as u64 > limit;
        if has_next_page {
            rows.pop();
        }
        let next_cursor = if has_next_page {
            rows.last().map(|row| (row.timestamp, row.id))
        } else {
            None
        };
        let payloads = rows
            .into_iter()
            .map(|row| {
                let event = serde_json::from_str(&row.data)
                    .map_err(|error| DbErr::Custom(format!("JSON Parse Error: {error}")))?;
                Ok(LogPayload {
                    event,
                    timestamp: row.timestamp,
                    hash: row.hash,
                })
            })
            .collect::<Result<Vec<_>, DbErr>>()?;
        Ok((payloads, next_cursor))
    }

    pub async fn delete_all_logs(&self) -> Result<(), DbErr> {
        logs::Entity::delete_many().exec(&self.db).await?;

        self.db
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "VACUUM;".to_owned(),
            ))
            .await?;

        Ok(())
    }
}
