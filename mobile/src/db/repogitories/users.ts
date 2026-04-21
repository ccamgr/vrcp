import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { users } from "../schema/users";

export const usersRepo = createBaseRepository(db, users);

