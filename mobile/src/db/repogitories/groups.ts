import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { groups } from "../schema/groups";

export const groupsRepo = createBaseRepository(db, groups);

