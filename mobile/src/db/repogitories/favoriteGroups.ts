import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { favoriteGroups } from "../schema/favoriteGroups";

export const favoriteGroupsRepo = createBaseRepository(db, favoriteGroups);

