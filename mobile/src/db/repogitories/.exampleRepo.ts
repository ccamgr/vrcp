import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { exsampleTable } from "../schema/.exampleSchema";
import { eq } from "drizzle-orm";

export const exampleRepo = {
  ...createBaseRepository(db, exsampleTable),

  // You can add custom methods specific to the example table here
  additionalLogic: async (param: number) => {
    const result = await db.select().from(exsampleTable).where(eq(exsampleTable.createdAt, param)).get();
    return result;
  }
};

