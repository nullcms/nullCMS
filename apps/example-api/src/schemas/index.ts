import type { CMSSchema } from "@nullcms/shared";
import { blogSchema } from "./blog";
import { settingsSchema } from "./settings";

export const schema: CMSSchema = {
	collections: {
		articles: blogSchema,
	},
	singletons: {
		settings: settingsSchema,
	},
};

export * from "./blog";
export * from "./settings";
