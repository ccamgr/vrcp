// constants and textm, colors for VRChat integration

import { use } from "react";


export const vrcTexts = {
  trustRank: {
    nuisance: "Nuisance",
    visitor: "Visitor",
    new_user: "New User",
    user: "User",
    known: "Known",
    trusted: "Trusted",
    legend: "Legend",
  },
  instanceType: {
    offline: "Offline",
    private: "Private",
    friends_plus: "Friends+",
    friends: "Friends",
    public: "Public",
    group: "Group",
    group_plus: "Group+",
    group_public: "GroupPublic",

  },
}

export const vrcColors = {
  // friend or trust level colors
  friend: "#ffee00ff",
  trustRank: {
    legend: "#ff0101ff",
    trusted: "#aa01ffff",
    known: "#ff8800ff",
    user: "#26ff00ff",
    new_user: "#004cffff",
    visitor: "#adadadff",
    nuisance: "#363636ff",
  },
  // user status colors
  userStatus: {
    join_me: "#00bbffff",
    online: "#59ff00ff",
    ask_me: "#ff7b00ff",
    busy: "#b10000ff",
    offline: "#595959ff",
  },

  // releaseStatus colors
  releaseStatus: {
    public: "#5fa4ffff",
    private: "#ff8636ff",
    hidden: "#3d3c3cff",
  },
};
