import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { groups, convertFromDBGroup, convertToDBGroup } from "../schema/groups";

export const groupsRepo = createBaseCacheRepo(db, groups, convertToDBGroup, convertFromDBGroup);
