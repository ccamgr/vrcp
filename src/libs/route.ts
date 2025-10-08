import { push } from "expo-router/build/global-state/routing";

export const routeToSearch = (search?:string) => {
  const q = []; 
  if (search) q.push(`search=${search}`);
  if (q.length) {
    push(`/modals/search?${q.join("&")}`);
  } else {
    push(`/modals/search`);
  }
};
export const routeToFriendLocations = () => push(`/modals/friendlocations`);
export const routeToFeeds = () => push(`/modals/feeds`);

export const routeToUser = (id:string) => push(`/modals/user/${id}`);
export const routeToWorld = (id:string) => push(`/modals/world/${id}`);
export const routeToAvatar = (id:string) => push(`/modals/avatar/${id}`);
export const routeToGroup = (id:string) => push(`/modals/group/${id}`);
export const routeToInstance = (wrldId:string, instId: string) => push(`/modals/instance/${wrldId}:${instId}`);