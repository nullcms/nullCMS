import { Hono } from 'hono';
import { schema } from './schemas';
import { CMS, cmsPlugin } from '@nullcms/api';
import { StorageType } from '@nullcms/shared';

// Define CMS configuration
const config = {
  storage: {
    type: 'lowstorage' as StorageType,
    config: {
      accessKeyId: '0281878b211e9d9ef727ac8e056538b9',
      secretAccessKey: '10174ea470a057cb4c7a0a032ca96a6ee074da5f628980b81562eae297abce1f',
      endpoint: 'https://7743e03fad48db9636b85c1f6ee46944.r2.cloudflarestorage.com/null-cms',
      requestAbortTimeout: undefined,
      bucketName: 'null-cms',
    }
  },
  logger: {
    type: 'text',
    minLevel: 'info',
    colorized: true
  },
  schema
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
    console.log('CMS initialized');
  }
}

// Register CMS plugin
cmsPlugin(app, cms);

// Cloudflare Workers handler
export default {
  async fetch(request: Request, env: any, ctx: any) {
    await ensureCMSInitialized(); // Initialize CMS before processing requests
    return app.fetch(request, env, ctx);
  },
};
