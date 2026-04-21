import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { worlds } from "../schema/worlds";

export const worldsRepo = createBaseRepository(db, worlds);

