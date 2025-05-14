import { CMS, cmsPlugin } from "@nullcms/api";
import type { StorageType } from "@nullcms/shared";
import { type ExecutionContext, Hono } from "hono";
import { schema } from "./schemas";

// Extend Env to include your Wrangler bindings
type CustomEnv = {
	Bindings: {
		DYNAMO_REGION: string;
		DYNAMO_ENDPOINT: string;
		DYNAMO_ACCESS_KEY_ID: string;
		DYNAMO_SECRET_ACCESS_KEY: string;
		DYNAMO_TABLE_PREFIX: string;
	};
};

const app = new Hono<CustomEnv>();
let cmsInitialized = false;
let cms: CMS;

// Middleware to ensure CMS is initialized on first request
async function ensureCMSInitialized(env: CustomEnv["Bindings"]) {
	if (!cmsInitialized) {
		const config = {
			storage: {
				type: "sqlite" as StorageType,
				config: {
					dbPath: "./db.sqlite",
					tablePrefix: env.DYNAMO_TABLE_PREFIX,
				},
			},
			logger: {
				type: "text",
				minLevel: "info",
				colorized: true,
			},
			schema,
		};

		cms = new CMS(config.storage, config.schema);
		await cms.initialize();
		cmsPlugin(app, cms);
		cmsInitialized = true;
		console.log("CMS initialized");
	}
}

// Cloudflare Workers handler
export default {
	async fetch(request: Request, env: CustomEnv["Bindings"], ctx: ExecutionContext) {
		await ensureCMSInitialized(env);
		return app.fetch(request, env, ctx);
	},
};
