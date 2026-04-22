import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { users } from "../schema/users";
import { lt } from "drizzle-orm";

export const usersRepo = createBaseCacheRepo(db, users);
