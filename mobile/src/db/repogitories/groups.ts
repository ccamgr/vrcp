import { createBaseCacheRepo } from "./_baseRepo";
import { db } from "../index";
import { groups } from "../schema/groups";
import { lt } from "drizzle-orm";

export const groupsRepo = createBaseCacheRepo(db, groups);
