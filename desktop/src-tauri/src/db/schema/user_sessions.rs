use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_sessions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub instance_session_id: i32,
    pub user_id: String,
    pub display_name: String,
    pub join_time: i64,
    pub leave_time: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::instance_sessions::Entity",
        from = "Column::InstanceSessionId",
        to = "super::instance_sessions::Column::Id"
    )]
    InstanceSessions,
}

impl Related<super::instance_sessions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::InstanceSessions.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
