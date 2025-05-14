import type { CMSSchema } from "@nullcms/shared";
import { blogSchema } from "./posts.js";
import { settingsSchema } from "./settings.js";
import { homepageSchema } from "./homepage.js";

export const schema: CMSSchema = {
	collections: {
		articles: blogSchema,
	},
	singletons: {
		settings: settingsSchema,
		homepage: homepageSchema
	},
};

export * from "./posts.js";
export * from "./settings.js";
