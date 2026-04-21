import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { logs } from "../schema/logs";

export const logsRepo = createBaseRepository(db, logs);

