import { LimitedUserFriend, UserStatus } from "@/generated/api";
import { parseLocationString } from "../vrchat";

  const statusOrder = (status: UserStatus) => {
    switch (status) {
      case "join me":
        return 5;
      case "active":
        return 4;
      case "ask me":
        return 3;
      case "busy":
        return 2;
      case "offline":
        return 1;
      default:
        return 0;
    }
  }
  const friendSorter = (a: LimitedUserFriend, b: LimitedUserFriend) => {
    // location がある順
    const locA = parseLocationString(a.location);
    const locB = parseLocationString(b.location);
    if (locA.parsedLocation && !locB.parsedLocation) return -1;
    if (!locA.parsedLocation && locB.parsedLocation) return 1;
    // status Order が大きい順
    const statusDiff = statusOrder(b.status) - statusOrder(a.status);
    if (statusDiff !== 0) return statusDiff;
    // last_activity が新しい順
    const aLast = a.last_activity ?? "";
    const bLast = b.last_activity ?? "";
    return bLast.localeCompare(aLast);
  }

  const sortFriendWithStatus = (friends: LimitedUserFriend[]) => {
    return friends.sort(friendSorter);
  }

  export { sortFriendWithStatus };