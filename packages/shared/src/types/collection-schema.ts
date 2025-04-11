import { z } from "zod";
import { CompleteFieldSchema } from "./field-schema";

export const CollectionSchemaObject = z.object({
	title: z.string(),
	description: z.string().optional(),
	timestamps: z.boolean().optional().default(true),
	fields: z.record(CompleteFieldSchema),
});

export type CollectionSchema = z.infer<typeof CollectionSchemaObject>;
