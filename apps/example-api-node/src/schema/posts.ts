import type { CollectionSchema } from "@nullcms/shared";

export const blogSchema: CollectionSchema = {
	title: "Blog Post",
	description: "A blog post with content and metadata",
	timestamps: true,
	fields: {
		title: {
			type: "string",
			required: true,
			label: "Title",
		},
		excerpt: {
			type: "string",
			label: "Excerpt",
		},
		content: {
			type: "richtext",
			required: true,
			label: "Content",
		}
	},
};
