use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use vrchatapi::apis::notifications_api::get_notifications as get_vrchat_notifications;
use vrchatapi::models::Notification;

use crate::Ctx;

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct AppNotification {
    pub id: String,
    #[serde(rename = "type")]
    pub notification_type: String,
    pub message: String,
    #[serde(rename = "senderUsername")]
    pub sender_username: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub unread: bool,
}

fn notification_to_app_notification(notification: Notification) -> AppNotification {
    let value = serde_json::to_value(notification).unwrap_or_default();
    let get_string = |key: &str| {
        value
            .get(key)
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string()
    };

    AppNotification {
        id: get_string("id"),
        notification_type: get_string("type"),
        message: get_string("message"),
        sender_username: value
            .get("senderUsername")
            .and_then(|value| value.as_str())
            .map(ToString::to_string),
        created_at: get_string("created_at"),
        unread: value.get("seen").and_then(|value| value.as_bool()) != Some(true),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_notifications(state: State<'_, Ctx>) -> Result<Vec<AppNotification>, String> {
    let config = state.vrcapi.config.lock().await.clone();
    let notifications =
        get_vrchat_notifications(&config, None, None, None, None, Some(100), Some(0))
            .await
            .map_err(|error| {
                let message = error.to_string();
                crate::logging::error(
                    "api.notifications",
                    &[("status", "failed"), ("error", &message)],
                );
                format!("Failed to load notifications: {error}")
            })?;
    let notifications = notifications
        .into_iter()
        .map(notification_to_app_notification)
        .collect::<Vec<_>>();

    crate::logging::info(
        "api.notifications",
        &[
            ("status", "success"),
            ("count", &notifications.len().to_string()),
        ],
    );
    Ok(notifications)
}
