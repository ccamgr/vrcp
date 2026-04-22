import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { worlds } from "../schema/worlds";
import { lt } from "drizzle-orm";

export const worldsRepo = createBaseCacheRepo(db, worlds);
