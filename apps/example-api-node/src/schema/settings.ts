import type { SingletonSchema } from "@nullcms/shared/src/index.js";

export const settingsSchema: SingletonSchema = {
	title: "Site Settings",
	description: "Global site settings",
	timestamps: true,
	fields: {
		siteTitle: {
			type: "string",
			required: true,
			label: "Site Title",
		},
		siteDescription: {
			type: "string",
			label: "Site Description",
		},
		navbar: {
			type: "array",
			of: {
				label: {
					type: "string",
					label: "Label",
				},
				link: {
					type: "string",
					label: "Link",
				},
			},
			label: "Navbar Items",
		},
		footer: {
			type: "string",
			label: "Footer Text",
			required: true
		}
	},
};
