import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { avatars, convertFromDBAvatar, convertToDBAvatar } from "../schema/avatars";

export const avatarsRepo = createBaseCacheRepo(db, avatars, convertToDBAvatar, convertFromDBAvatar);
