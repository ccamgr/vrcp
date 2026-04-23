import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { worlds, convertFromDBWorld, convertToDBWorld } from "../schema/worlds";

export const worldsRepo = createBaseCacheRepo(db, worlds, convertToDBWorld, convertFromDBWorld);
