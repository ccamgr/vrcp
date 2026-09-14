use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        add_app_column(
            manager,
            ColumnDef::new(AppSessions::LastEventTime)
                .big_integer()
                .not_null()
                .default(0)
                .to_owned(),
        )
        .await?;
        for column in [
            ColumnDef::new(AppSessions::UserId).string().to_owned(),
            ColumnDef::new(AppSessions::Username).string().to_owned(),
            ColumnDef::new(AppSessions::PendingWorldName)
                .string()
                .to_owned(),
        ] {
            add_app_column(manager, column).await?;
        }
        manager
            .alter_table(
                Table::alter()
                    .table(InstanceSessions::Table)
                    .add_column(
                        ColumnDef::new(InstanceSessions::LastEventTime)
                            .big_integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE INDEX IF NOT EXISTS idx_app_sessions_time ON app_sessions(end_time, start_time);
                CREATE INDEX IF NOT EXISTS idx_instance_sessions_app_time ON instance_sessions(app_session_id, end_time, start_time);
                CREATE INDEX IF NOT EXISTS idx_user_sessions_instance_user ON user_sessions(instance_session_id, user_id, leave_time);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_active_app_session ON app_sessions(1) WHERE end_time IS NULL;
                CREATE UNIQUE INDEX IF NOT EXISTS idx_active_instance_session ON instance_sessions(app_session_id) WHERE end_time IS NULL;
                CREATE UNIQUE INDEX IF NOT EXISTS idx_active_user_session ON user_sessions(instance_session_id, user_id) WHERE leave_time IS NULL;
                CREATE TRIGGER IF NOT EXISTS validate_app_session_insert BEFORE INSERT ON app_sessions
                WHEN NOT ((NEW.end_time IS NULL AND NEW.is_graceful IS NULL) OR (NEW.end_time IS NOT NULL AND NEW.is_graceful IS NOT NULL AND NEW.end_time >= NEW.start_time))
                BEGIN SELECT RAISE(ABORT, 'invalid app session bounds'); END;
                CREATE TRIGGER IF NOT EXISTS validate_app_session_update BEFORE UPDATE OF start_time, end_time, is_graceful ON app_sessions
                WHEN NOT ((NEW.end_time IS NULL AND NEW.is_graceful IS NULL) OR (NEW.end_time IS NOT NULL AND NEW.is_graceful IS NOT NULL AND NEW.end_time >= NEW.start_time))
                BEGIN SELECT RAISE(ABORT, 'invalid app session bounds'); END;
                CREATE TRIGGER IF NOT EXISTS validate_instance_session_insert BEFORE INSERT ON instance_sessions
                WHEN NOT ((NEW.end_time IS NULL AND NEW.is_graceful IS NULL) OR (NEW.end_time IS NOT NULL AND NEW.is_graceful IS NOT NULL AND NEW.end_time >= NEW.start_time))
                BEGIN SELECT RAISE(ABORT, 'invalid instance session bounds'); END;
                CREATE TRIGGER IF NOT EXISTS validate_instance_session_update BEFORE UPDATE OF start_time, end_time, is_graceful ON instance_sessions
                WHEN NOT ((NEW.end_time IS NULL AND NEW.is_graceful IS NULL) OR (NEW.end_time IS NOT NULL AND NEW.is_graceful IS NOT NULL AND NEW.end_time >= NEW.start_time))
                BEGIN SELECT RAISE(ABORT, 'invalid instance session bounds'); END;
                CREATE TRIGGER IF NOT EXISTS validate_user_session_insert BEFORE INSERT ON user_sessions
                WHEN NEW.leave_time IS NOT NULL AND NEW.leave_time < NEW.join_time
                BEGIN SELECT RAISE(ABORT, 'invalid user session bounds'); END;
                CREATE TRIGGER IF NOT EXISTS validate_user_session_update BEFORE UPDATE OF join_time, leave_time ON user_sessions
                WHEN NEW.leave_time IS NOT NULL AND NEW.leave_time < NEW.join_time
                BEGIN SELECT RAISE(ABORT, 'invalid user session bounds'); END;
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DROP TRIGGER IF EXISTS validate_user_session_update;
                DROP TRIGGER IF EXISTS validate_user_session_insert;
                DROP TRIGGER IF EXISTS validate_instance_session_update;
                DROP TRIGGER IF EXISTS validate_instance_session_insert;
                DROP TRIGGER IF EXISTS validate_app_session_update;
                DROP TRIGGER IF EXISTS validate_app_session_insert;
                DROP INDEX IF EXISTS idx_active_user_session;
                DROP INDEX IF EXISTS idx_active_instance_session;
                DROP INDEX IF EXISTS idx_active_app_session;
                DROP INDEX IF EXISTS idx_user_sessions_instance_user;
                DROP INDEX IF EXISTS idx_instance_sessions_app_time;
                DROP INDEX IF EXISTS idx_app_sessions_time;
                "#,
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(InstanceSessions::Table)
                    .drop_column(InstanceSessions::LastEventTime)
                    .to_owned(),
            )
            .await?;
        for column in [
            AppSessions::PendingWorldName,
            AppSessions::Username,
            AppSessions::UserId,
            AppSessions::LastEventTime,
        ] {
            manager
                .alter_table(
                    Table::alter()
                        .table(AppSessions::Table)
                        .drop_column(column)
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }
}

async fn add_app_column(manager: &SchemaManager<'_>, mut column: ColumnDef) -> Result<(), DbErr> {
    manager
        .alter_table(
            Table::alter()
                .table(AppSessions::Table)
                .add_column(&mut column)
                .to_owned(),
        )
        .await
}

#[derive(Iden)]
enum AppSessions {
    Table,
    LastEventTime,
    UserId,
    Username,
    PendingWorldName,
}

#[derive(Iden)]
enum InstanceSessions {
    Table,
    LastEventTime,
}
