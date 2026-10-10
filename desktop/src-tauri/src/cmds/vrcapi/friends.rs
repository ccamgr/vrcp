use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use vrchatapi::apis::{
    favorites_api::get_favorites, friends_api::get_friends, worlds_api::get_world,
};

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

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct FriendInstancesResponse {
    pub instances: Vec<FriendInstance>,
    #[serde(rename = "favoriteSortAvailable")]
    pub favorite_sort_available: bool,
}

struct LocatedFriend {
    presence: FriendPresence,
    is_favorite: bool,
}

async fn get_favorite_friend_ids(
    config: &vrchatapi::apis::configuration::Configuration,
) -> Result<Vec<String>, String> {
    let mut offset = 0_i32;
    let mut favorite_ids = Vec::new();

    loop {
        let favorites = get_favorites(config, Some(100), Some(offset), Some("friend"), None)
            .await
            .map_err(|error| error.to_string())?;
        let count = i32::try_from(favorites.len())
            .map_err(|_| "Favorite list is too large to paginate".to_string())?;

        favorite_ids.extend(favorites.into_iter().map(|favorite| favorite.favorite_id));
        if count < 100 {
            break;
        }
        offset += count;
    }

    Ok(favorite_ids)
}

#[tauri::command]
#[specta::specta]
pub async fn get_friend_instances(
    state: State<'_, Ctx>,
) -> Result<FriendInstancesResponse, String> {
    let config = state.vrcapi.config.lock().await;
    let mut offset = 0_i32;
    let (favorite_friend_ids, favorite_sort_available) =
        match get_favorite_friend_ids(&config).await {
            Ok(ids) => (
                ids.into_iter().collect::<std::collections::HashSet<_>>(),
                true,
            ),
            Err(error) => {
                crate::logging::warn(
                    "api.friend_instances.favorites",
                    &[("status", "failed"), ("error", &error)],
                );
                (Default::default(), false)
            }
        };
    let mut locations: BTreeMap<(String, String), Vec<LocatedFriend>> = BTreeMap::new();

    loop {
        let friends = get_friends(&config, Some(offset), Some(100), Some(false))
            .await
            .map_err(|error| {
                let message = error.to_string();
                crate::logging::error(
                    "api.friend_instances",
                    &[("status", "failed"), ("error", &message)],
                );
                format!("Failed to load friends: {error}")
            })?;
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
                .push(LocatedFriend {
                    is_favorite: favorite_friend_ids.contains(&friend.id),
                    presence: FriendPresence {
                        id: friend.id,
                        display_name: friend.display_name,
                        icon_url: friend.icon_url,
                        status: format!("{:?}", friend.status),
                    },
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
            let favorite_friend_count = friends.iter().filter(|friend| friend.is_favorite).count();
            let (world_name, world_thumbnail_url) = worlds
                .get(&world_id)
                .and_then(|world| world.clone())
                .unwrap_or_else(|| (world_id.clone(), None));
            (
                favorite_friend_count,
                FriendInstance {
                    world_id,
                    instance_id,
                    world_name,
                    world_thumbnail_url,
                    friends: friends.into_iter().map(|friend| friend.presence).collect(),
                },
            )
        })
        .collect::<Vec<_>>();
    instances.sort_by(
        |(left_favorite_count, left), (right_favorite_count, right)| {
            right_favorite_count
                .cmp(left_favorite_count)
                .then_with(|| right.friends.len().cmp(&left.friends.len()))
                .then_with(|| left.world_id.cmp(&right.world_id))
                .then_with(|| left.instance_id.cmp(&right.instance_id))
        },
    );
    let instances = instances
        .into_iter()
        .map(|(_, instance)| instance)
        .collect::<Vec<_>>();

    crate::logging::info(
        "api.friend_instances",
        &[
            ("status", "success"),
            ("count", &instances.len().to_string()),
            (
                "favorite_sort_available",
                &favorite_sort_available.to_string(),
            ),
        ],
    );
    Ok(FriendInstancesResponse {
        instances,
        favorite_sort_available,
    })
}
