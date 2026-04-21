import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { avatars } from "../schema/avatars";

export const avatarsRepo = createBaseRepository(db, avatars);

