import { router } from "expo-router";


export const routeToIndex = () => router.replace("/"); // use replace to avoid going back to login screen
export const routeToHome = () => router.replace("/maintabs/home"); // use replace to avoid going back to login screen

// Detail routes
export const routeToUser = (id: string) => router.push(`/details/user/${id}`);
export const routeToWorld = (id: string) => router.push(`/details/world/${id}`);
export const routeToAvatar = (id: string) => router.push(`/details/avatar/${id}`);
export const routeToGroup = (id: string) => router.push(`/details/group/${id}`);
export const routeToInstance = (wrldId: string, instId: string) => router.push(`/details/instance/${wrldId}:${instId}`);
export const routeToEvent = (grpId: string, calId: string) => router.push(`/details/event/${grpId}:${calId}`);

// user sub-routes
export const routeToUserWorlds = (id: string) => router.push(`/details/user/${id}/worlds`);
export const routeToUserGroups = (id: string) => router.push(`/details/user/${id}/groups`);

// Settings routes
export const routeToAppearanceSettings = () => router.push(`/settings/appearance`);
export const routeToDatabaseSettings = () => router.push(`/settings/database`);
export const routeToNotificationSettings = () => router.push(`/settings/notification`);
export const routeToDesktopAppSettings = () => router.push(`/settings/desktopapp`);
export const routeToLanguageSettings = () => router.push(`/settings/language`);

// Others routes
export const routeToSearch = (search?: string) => {
  const q = [];
  if (search) q.push(`search=${search}`);
  router.push(`/others/search?${q.join("&")}`);
};
export const routeToAvatars = () => router.push(`/others/avatars`); // owned avatars
export const routeToWorlds = () => router.push(`/others/worlds`); // owned worlds
export const routeToGroups = () => router.push(`/others/groups`); // joined groups
export const routeToPrints = () => router.push(`/others/prints`); // owned prints
export const routeToFavorites = () => router.push(`/others/favorites`); // favorites
export const routeToFriendLocations = () => router.push(`/others/friendlocations`); // my friend's locations
export const routeToCalendar = () => router.push(`/others/calendar`); // event calendar of joined groups
export const routeToFeeds = () => router.push(`/others/feeds`); // feeds
export const routeToNotifications = () => router.push(`/others/notifications`); // notifications
