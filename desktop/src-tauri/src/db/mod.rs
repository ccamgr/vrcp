pub mod core;
pub mod repositories;
pub mod schema;

// core.rs からmigratorが見える必要があるため mod 定義は必須です。
mod migrator;

// re-exportss
// crate::db::Database => crate::db::core::Database;
pub use core::DB;
pub use core::DbResult;
