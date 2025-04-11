import { CMS, cmsPlugin } from "@nullcms/api";
import type { StorageType } from "@nullcms/shared";
import { type Env, type ExecutionContext, Hono } from "hono";
import { schema } from "./schemas";

// Define CMS configuration
const config = {
	storage: {
		type: "lowstorage" as StorageType,
		config: {
			accessKeyId: ***REMOVED***,
			secretAccessKey:
				***REMOVED***,
			endpoint:
				***REMOVED***,
			requestAbortTimeout: undefined,
			bucketName: ***REMOVED***,
		},
	},
	logger: {
		type: "text",
		minLevel: "info",
		colorized: true,
	},
	schema,
};

// Create the main app
const app = new Hono();
const cms = new CMS(config.storage, config.schema);
let cmsInitialized = false;

// Middleware to ensure CMS is initialized on first request
async function ensureCMSInitialized() {
	if (!cmsInitialized) {
		await cms.initialize();
		cmsInitialized = true;
		console.log("CMS initialized");
	}
}

// Register CMS plugin
cmsPlugin(app, cms);

// Cloudflare Workers handler
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		await ensureCMSInitialized(); // Initialize CMS before processing requests
		return app.fetch(request, env, ctx);
	},
};
