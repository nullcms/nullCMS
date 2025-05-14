import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { CMS, cmsPlugin } from "@nullcms/api/src/index.js";
import type { StorageType } from '@nullcms/shared';
import { schema } from './schema/index.js';
import { config as dotenv } from 'dotenv'
import { renderToString } from 'hono/jsx/dom/server';
import { html } from 'hono/html';
import { serveStatic } from '@hono/node-server/serve-static';

dotenv();

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

//@ts-ignore
const devServer = import.meta.env !== undefined;
console.log("Dev server:", devServer);

const baseHtml = (scriptSrc: string) => html`
  <html>
    <head>
      <meta charSet='utf-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <title>NullCMS Backoffice</title>
      <link rel='stylesheet' href='/client/assets/index.css' />
      <script type='module' src='${scriptSrc}'></script>
    </head>
    <body>
      <div id='root'></div>
    </body>
  </html>
`;

if (!devServer) {
  app.use('/client/*', serveStatic({ root: './dist/' }))
}

app.get('/', (c) => { 
  return c.redirect('/backoffice');
});

app.get('/backoffice/*', (c) => {
  //@ts-ignore
  const scriptSrc = import.meta.env !== undefined
    ? '/src/backoffice/index.tsx'
    : '/client/index.js';

  return c.html(
    renderToString(
      baseHtml(scriptSrc)
    )
  );
});

// Middleware to ensure CMS is initialized on first request
const config = {
  storage: {
    type: "sqlite" as StorageType,
    config: {
      dbPath: process.env.DB_PATH,
      tablePrefix: process.env.TABLE_PREFIX,
    },
  },
  logger: {
    type: "text",
    minLevel: "info",
    colorized: true,
  },
  schema,
};
console.log(config)

const cms = new CMS(config.storage, config.schema);
cms.initialize();
//@ts-ignore
cmsPlugin(app, cms);
console.log("CMS initialized");

serve({
  fetch: app.fetch,
  port: devServer ? 0 : 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

export default app;