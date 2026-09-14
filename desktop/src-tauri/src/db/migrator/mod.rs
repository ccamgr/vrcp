use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260420_113556_unnamed_migration::Migration),
            Box::new(m20260620_054826_create_session_tables::Migration),
            Box::new(m20260914_000000_extend_session_projection::Migration),
        ]
    }
}
mod m20260420_113556_unnamed_migration;
mod m20260620_054826_create_session_tables;
mod m20260914_000000_extend_session_projection;
