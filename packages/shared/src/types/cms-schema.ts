import { z } from "zod";
import { CollectionSchemaObject } from "./collection-schema";
import { SingletonSchemaObject } from "./singleton-schema";

export const CMSSchemaObject = z.object({
    collections: z.record(CollectionSchemaObject).optional(),
    singletons: z.record(SingletonSchemaObject).optional(),
});

export type CMSSchema = z.infer<typeof CMSSchemaObject>;