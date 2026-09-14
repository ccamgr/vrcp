use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "instance_sessions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub app_session_id: i32,
    pub world_name: String,
    pub instance_id: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub last_event_time: i64,
    pub is_graceful: Option<bool>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::app_sessions::Entity",
        from = "Column::AppSessionId",
        to = "super::app_sessions::Column::Id"
    )]
    AppSessions,
    #[sea_orm(has_many = "super::user_sessions::Entity")]
    UserSessions,
}

impl Related<super::app_sessions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AppSessions.def()
    }
}

impl Related<super::user_sessions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::UserSessions.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
