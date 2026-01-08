import { push, replace } from "expo-router/build/global-state/routing";


export const routeToIndex = () => replace("/"); // use replace to avoid going back to login screen
export const routeToHome = () => replace("/maintabs/home"); // use replace to avoid going back to login screen

// Detail routes
export const routeToUser = (id: string) => push(`/details/user/${id}`);
export const routeToWorld = (id: string) => push(`/details/world/${id}`);
export const routeToAvatar = (id: string) => push(`/details/avatar/${id}`);
export const routeToGroup = (id: string) => push(`/details/group/${id}`);
export const routeToInstance = (wrldId: string, instId: string) => push(`/details/instance/${wrldId}:${instId}`);
export const routeToEvent = (grpId: string, calId: string) => push(`/details/event/${grpId}:${calId}`);

// user sub-routes
export const routeToUserWorlds = (id: string) => push(`/details/user/${id}/worlds`);
export const routeToUserGroups = (id: string) => push(`/details/user/${id}/groups`);

// Settings routes
export const routeToAppearanceSettings = () => push(`/settings/appearance`);
export const routeToDatabaseSettings = () => push(`/settings/database`);
export const routeToNotificationSettings = () => push(`/settings/notifications`);
export const routeToDesktopAppSettings = () => push(`/settings/desktopapp`);
export const routeToLanguageSettings = () => push(`/settings/language`);

// Others routes
export const routeToSearch = (search?: string) => {
  const q = [];
  if (search) q.push(`search=${search}`);
  push(`/others/search?${q.join("&")}`);
};
export const routeToAvatars = () => push(`/others/avatars`); // owned avatars
export const routeToWorlds = () => push(`/others/worlds`); // owned worlds
export const routeToGroups = () => push(`/others/groups`); // joined groups
export const routeToPrints = () => push(`/others/prints`); // owned prints
export const routeToFavorites = () => push(`/others/favorites`); // favorites
export const routeToFriendLocations = () => push(`/others/friendlocations`); // my friend's locations
export const routeToCalendar = () => push(`/others/calendar`); // event calendar of joined groups
export const routeToFeeds = () => push(`/others/feeds`); // feeds
export const routeToNotifications = () => push(`/others/notifications`); // notifications
