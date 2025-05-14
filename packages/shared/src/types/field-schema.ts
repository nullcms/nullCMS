import { z } from "zod";

export const StringFieldSchema = z.object({
	type: z.literal("string"),
	required: z.boolean().optional(),
	label: z.string(),
	pattern: z.string().optional(),
	default: z.string().optional(),
});

export const NumberFieldSchema = z.object({
	type: z.literal("number"),
	required: z.boolean().optional(),
	label: z.string(),
	min: z.number().optional(),
	max: z.number().optional(),
	default: z.number().optional(),
});

export const BooleanFieldSchema = z.object({
	type: z.literal("boolean"),
	required: z.boolean().optional(),
	label: z.string(),
	default: z.boolean().optional(),
});

export const DateFieldSchema = z.object({
	type: z.literal("date"),
	required: z.boolean().optional(),
	label: z.string(),
	default: z.string().optional(),
});

export const ImageFieldSchema = z.object({
	type: z.literal("image"),
	required: z.boolean().optional(),
	label: z.string(),
});

export const FileFieldSchema = z.object({
	type: z.literal("file"),
	required: z.boolean().optional(),
	label: z.string(),
	allowedTypes: z.array(z.string()).optional(),
});

export const RichTextFieldSchema = z.object({
	type: z.literal("richtext"),
	required: z.boolean().optional(),
	label: z.string(),
	default: z.string().optional(),
});

// Base schema types without recursive references
export const BaseFieldSchema = z.union([
	StringFieldSchema,
	NumberFieldSchema,
	BooleanFieldSchema,
	DateFieldSchema,
	ImageFieldSchema,
	FileFieldSchema,
	RichTextFieldSchema,
]);

// Array field schema
export const ArrayFieldSchema = z.object({
	type: z.literal("array"),
	required: z.boolean().optional(),
	label: z.string(),
	min: z.number().optional(),
	max: z.number().optional(),
	of: z.record(BaseFieldSchema),
  });

const AFieldSchema = z.union([BaseFieldSchema, ArrayFieldSchema]);

// Expand field schema
export const ExpandFieldSchema = z.object({
	type: z.literal("expand"),
	required: z.boolean().optional(),
	label: z.string(),
	description: z.string().optional(),
	fields: z.record(AFieldSchema)
});

// Complete the recursive type definition
export const CompleteFieldSchema = z.union([AFieldSchema, ExpandFieldSchema]);

// Type exports
export type StringField = z.infer<typeof StringFieldSchema>;
export type NumberField = z.infer<typeof NumberFieldSchema>;
export type BooleanField = z.infer<typeof BooleanFieldSchema>;
export type DateField = z.infer<typeof DateFieldSchema>;
export type ImageField = z.infer<typeof ImageFieldSchema>;
export type FileField = z.infer<typeof FileFieldSchema>;
export type RichTextField = z.infer<typeof RichTextFieldSchema>;
export type ArrayField = z.infer<typeof ArrayFieldSchema>;
export type ExpandField = z.infer<typeof ExpandFieldSchema>;
export type Field = z.infer<typeof CompleteFieldSchema>;
