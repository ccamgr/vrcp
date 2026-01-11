use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Logs Table
        manager
            .create_table(
                Table::create()
                    .table(Logs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Logs::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Logs::Timestamp).string().not_null())
                    .col(ColumnDef::new(Logs::EventType).string().not_null())
                    .col(ColumnDef::new(Logs::Data).string().not_null()) // JSON string
                    .col(
                        ColumnDef::new(Logs::Hash)
                            .big_integer()
                            .not_null()
                            .unique_key(),
                    )
                    .to_owned(),
            )
            .await?;

        // Settings Table
        manager
            .create_table(
                Table::create()
                    .table(Settings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Settings::Key)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Settings::Value).string().not_null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Logs::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Settings::Table).to_owned())
            .await
    }
}

// Identifiers for table/columns (Internal use for migration)
#[derive(Iden)]
enum Logs {
    Table,
    Id,
    Timestamp,
    EventType,
    Data,
    Hash,
}

#[derive(Iden)]
enum Settings {
    Table,
    Key,
    Value,
}
