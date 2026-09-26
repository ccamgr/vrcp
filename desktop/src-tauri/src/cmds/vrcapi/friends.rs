use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use vrchatapi::apis::{friends_api::get_friends, worlds_api::get_world};

use crate::Ctx;

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct FriendPresence {
    pub id: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "iconUrl")]
    pub icon_url: Option<String>,
    pub status: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct FriendInstance {
    #[serde(rename = "worldId")]
    pub world_id: String,
    #[serde(rename = "instanceId")]
    pub instance_id: String,
    #[serde(rename = "worldName")]
    pub world_name: String,
    #[serde(rename = "worldThumbnailUrl")]
    pub world_thumbnail_url: Option<String>,
    pub friends: Vec<FriendPresence>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_friend_instances(state: State<'_, Ctx>) -> Result<Vec<FriendInstance>, String> {
    let config = state.vrcapi.config.lock().await;
    let mut offset = 0_i32;
    let mut locations: BTreeMap<(String, String), Vec<FriendPresence>> = BTreeMap::new();

    loop {
        let friends = get_friends(&config, Some(offset), Some(100), Some(false))
            .await
            .map_err(|error| format!("Failed to load friends: {error}"))?;
        let count = i32::try_from(friends.len())
            .map_err(|_| "Friend list is too large to paginate".to_string())?;

        for friend in friends {
            let Some((world_id, instance_id)) = friend.location.split_once(':') else {
                continue;
            };
            if !world_id.starts_with("wrld_") || instance_id.is_empty() {
                continue;
            }

            locations
                .entry((world_id.to_string(), instance_id.to_string()))
                .or_default()
                .push(FriendPresence {
                    id: friend.id,
                    display_name: friend.display_name,
                    icon_url: friend.icon_url,
                    status: format!("{:?}", friend.status),
                });
        }

        if count < 100 {
            break;
        }
        offset += count;
    }

    let mut worlds = HashMap::new();
    for world_id in locations.keys().map(|(world_id, _)| world_id) {
        if worlds.contains_key(world_id) {
            continue;
        }
        let details = get_world(&config, world_id).await.ok();
        let world = details.map(|world| (world.name, Some(world.thumbnail_image_url)));
        worlds.insert(world_id.clone(), world);
    }

    let mut instances = locations
        .into_iter()
        .map(|((world_id, instance_id), friends)| {
            let (world_name, world_thumbnail_url) = worlds
                .get(&world_id)
                .and_then(|world| world.clone())
                .unwrap_or_else(|| (world_id.clone(), None));
            FriendInstance {
                world_id,
                instance_id,
                world_name,
                world_thumbnail_url,
                friends,
            }
        })
        .collect::<Vec<_>>();
    instances.sort_by(|left, right| right.friends.len().cmp(&left.friends.len()));

    Ok(instances)
}
