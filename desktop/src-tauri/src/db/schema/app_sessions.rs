use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "app_sessions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub last_event_time: i64,
    pub is_graceful: Option<bool>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub pending_world_name: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::instance_sessions::Entity")]
    InstanceSessions,
}

impl Related<super::instance_sessions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::InstanceSessions.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
