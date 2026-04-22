import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { avatars } from "../schema/avatars";

export const avatarsRepo = createBaseCacheRepo(db, avatars);

