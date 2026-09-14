use super::repositories::{
    logs::LogsRepository, sessions::SessionsRepository, settings::SettingsRepository,
};
use crate::db::migrator::Migrator;
use sea_orm::{ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::MigratorTrait;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

// エラー型のエイリアス (必要に応じて拡張可能)
pub type DbResult<T> = Result<T, DbErr>;

#[derive(Clone)]
pub struct DB {
    pub connection: DatabaseConnection,
    projection_lock: Arc<Mutex<()>>,
}

impl DB {
    /// データベースへの接続と初期化
    pub async fn new(app_dir: PathBuf) -> DbResult<Self> {
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir).map_err(|e| DbErr::Custom(e.to_string()))?;
        }

        let db_path = app_dir.join("vrcp.db");
        // mode=rwc: 読み書き作成モード
        let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

        let connection = Database::connect(&db_url).await?;

        // SQLite固有設定: 外部キー制約の有効化
        connection
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "PRAGMA foreign_keys = ON;".to_owned(),
            ))
            .await?;

        // マイグレーションの実行
        Migrator::up(&connection, None).await?;

        Ok(Self {
            connection,
            projection_lock: Arc::new(Mutex::new(())),
        })
    }

    // --- Repositories Accessors ---
    // これにより db.logs().add(...) のようにアクセスできます

    pub fn logs(&self) -> LogsRepository {
        LogsRepository::new(self.connection.clone())
    }

    pub fn settings(&self) -> SettingsRepository {
        SettingsRepository::new(self.connection.clone())
    }

    pub fn sessions(&self) -> SessionsRepository {
        SessionsRepository::new(self.connection.clone())
    }

    pub async fn record_log(&self, payload: &crate::modules::watcher::LogPayload) -> DbResult<()> {
        let rebuild_required = {
            let _guard = self.projection_lock.lock().await;
            self.sessions().record_log(payload).await?
        };
        if rebuild_required {
            self.backfill_sessions().await?;
        }
        Ok(())
    }

    pub async fn backfill_sessions(&self) -> DbResult<()> {
        let _guard = self.projection_lock.lock().await;
        self.sessions().backfill().await
    }

    pub async fn get_sessions(
        &self,
        start: Option<i64>,
        end: Option<i64>,
    ) -> Result<Vec<crate::cmds::vrclog::sessions::SessionPayload>, DbErr> {
        let _guard = self.projection_lock.lock().await;
        self.sessions().get_sessions(start, end).await
    }

    pub async fn delete_all_log_data(&self) -> DbResult<()> {
        let _guard = self.projection_lock.lock().await;
        self.sessions().delete_all().await?;
        self.connection
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "VACUUM;".to_owned(),
            ))
            .await
            .map(|_| ())
    }
}
