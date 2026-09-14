use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp, id);
                CREATE INDEX IF NOT EXISTS idx_instance_sessions_closed_range
                    ON instance_sessions(start_time, end_time) WHERE end_time IS NOT NULL;
                CREATE INDEX IF NOT EXISTS idx_instance_sessions_open_range
                    ON instance_sessions(last_event_time, start_time) WHERE end_time IS NULL;
                "#,
            )
            .await
            .map(|_| ())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DROP INDEX IF EXISTS idx_instance_sessions_open_range;
                DROP INDEX IF EXISTS idx_instance_sessions_closed_range;
                DROP INDEX IF EXISTS idx_logs_timestamp;
                "#,
            )
            .await
            .map(|_| ())
    }
}
