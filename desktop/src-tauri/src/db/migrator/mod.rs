use sea_orm_migration::prelude::*;


pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260420_113556_unnamed_migration::Migration),
        ]
    }
}
mod m20260420_113556_unnamed_migration;
