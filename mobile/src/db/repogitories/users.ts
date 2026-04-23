import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { users, convertFromDBUser, convertToDBUser } from "../schema/users";

export const usersRepo = createBaseCacheRepo(db, users, convertToDBUser, convertFromDBUser);
