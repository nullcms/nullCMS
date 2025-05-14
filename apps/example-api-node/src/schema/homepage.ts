import type { SingletonSchema } from "@nullcms/shared/src/types/singleton-schema.js";

export const homepageSchema: SingletonSchema = {
	title: "Homepage",
	description: "Homepage content and settings",
	timestamps: true,
	fields: {
		meta: {
			type: "expand",
			fields: {
				title: {
					type: "string",
					label: "Page Title",
				},
				description: {
					type: "string",
					label: "Page Description",
				}
			},
			label: "Meta Fields",
		},
		hero: {
			type: "expand",
			fields: {
				title: {
					type: "string",
					label: "Hero Title",
				},
				subtitle: {
					type: "string",
					label: "Hero Subtitle",
				}
			},
			label: "Hero Section",
		},
		projects: {
			type: "expand",
			fields: {
				title: {
					type: "string",
					label: "Projects Section Title",
				},
				seeMoreButtonText: {
					type: "string",
					label: "See More Button Text",
				},
				seeMoreButtonPath: {
					type: "string",
					label: "See More Button Path",
				}
			},
			label: "Projects Section",
		},
		articles: {
			type: "expand",
			fields: {
				title: {
					type: "string",
					label: "Articles Section Title",
				},
				seeMoreButtonText: {
					type: "string",
					label: "See More Button Text",
				},
				seeMoreButtonPath: {
					type: "string",
					label: "See More Button Path",
				}
			},
			label: "Articles Section",
		},
	},
};
