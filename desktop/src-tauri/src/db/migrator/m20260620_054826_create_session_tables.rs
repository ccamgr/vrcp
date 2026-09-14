use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // app_sessions
        manager
            .create_table(
                Table::create()
                    .table(AppSessions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AppSessions::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AppSessions::StartTime)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(AppSessions::EndTime).big_integer())
                    .col(ColumnDef::new(AppSessions::IsGraceful).boolean())
                    .to_owned(),
            )
            .await?;

        // instance_sessions
        manager
            .create_table(
                Table::create()
                    .table(InstanceSessions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(InstanceSessions::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(InstanceSessions::AppSessionId)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InstanceSessions::WorldName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InstanceSessions::InstanceId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(InstanceSessions::StartTime)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(InstanceSessions::EndTime).big_integer())
                    .col(ColumnDef::new(InstanceSessions::IsGraceful).boolean())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-instance_sessions-app_session_id")
                            .from(InstanceSessions::Table, InstanceSessions::AppSessionId)
                            .to(AppSessions::Table, AppSessions::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // user_sessions
        manager
            .create_table(
                Table::create()
                    .table(UserSessions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserSessions::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(UserSessions::InstanceSessionId)
                            .integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(UserSessions::UserId).string().not_null())
                    .col(
                        ColumnDef::new(UserSessions::DisplayName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserSessions::JoinTime)
                            .big_integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(UserSessions::LeaveTime).big_integer())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-user_sessions-instance_session_id")
                            .from(UserSessions::Table, UserSessions::InstanceSessionId)
                            .to(InstanceSessions::Table, InstanceSessions::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(UserSessions::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(InstanceSessions::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(AppSessions::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum AppSessions {
    Table,
    Id,
    StartTime,
    EndTime,
    IsGraceful,
}

#[derive(Iden)]
enum InstanceSessions {
    Table,
    Id,
    AppSessionId,
    WorldName,
    InstanceId,
    StartTime,
    EndTime,
    IsGraceful,
}

#[derive(Iden)]
enum UserSessions {
    Table,
    Id,
    InstanceSessionId,
    UserId,
    DisplayName,
    JoinTime,
    LeaveTime,
}
