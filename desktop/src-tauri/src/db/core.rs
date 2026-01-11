use super::repositories::{logs::LogsRepository, settings::SettingsRepository};
use crate::db::migrator::Migrator;
use sea_orm::{ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, DbErr, Statement};
use sea_orm_migration::MigratorTrait;
use std::path::PathBuf;

// エラー型のエイリアス (必要に応じて拡張可能)
pub type DbResult<T> = Result<T, DbErr>;

#[derive(Clone)]
pub struct DB {
    pub connection: DatabaseConnection,
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

        Ok(Self { connection })
    }

    // --- Repositories Accessors ---
    // これにより db.logs().add(...) のようにアクセスできます

    pub fn logs(&self) -> LogsRepository {
        LogsRepository::new(self.connection.clone())
    }

    pub fn settings(&self) -> SettingsRepository {
        SettingsRepository::new(self.connection.clone())
    }
}
