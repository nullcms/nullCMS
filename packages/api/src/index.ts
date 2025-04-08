import {Context, Hono, Next} from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CMS } from './core/cms';
import { createGraphQLApiRoute } from './api/graphql';
import { createRestApiRoutes } from "./api/rest";
import { showRoutes } from "hono/dev";
import {deleteCookie, getCookie, setCookie} from "hono/cookie";

export type Variables = {
  user: string;
}

export function cmsPlugin(app: Hono<{ Variables: Variables }>, cms: CMS) {
  app.use(cors({
    origin: ['http://localhost:4001', 'https://demo.nullcms.com'],
    allowHeaders: [],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PATCH', 'DELETE'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }));
  app.use(logger());

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  const requireAuth = async (c: Context, next: Next) => {
    let token = c.req.header('Authorization')?.split(' ')[1]
    if (!token) {
      token = getCookie(c, "auth") as string;
      console.log(token)
    }

    if (!token) {
      return c.json({ success: false, message: 'Authentication required' }, 401)
    }

    const session = await cms.auth.validateSession(token)
    if (!session.valid) {
      return c.json({ success: false, message: session.reason }, 401)
    }

    c.set('user', session.userId)
    await next()
  }

  app.use('/api/*', requireAuth)
  app.use('/graphql/*', requireAuth)
  app.use('/auth/logout', requireAuth)

  const restApi = createRestApiRoutes(cms);
  app.route('/api', restApi);

  app.post('/auth/login', async (c) => {
    const { username, password } = await c.req.json()
    const result = await cms.auth.login(username, password)
    setCookie(c, "auth", result.token!, {httpOnly: true})
    if (result.success) {
      return c.json(result, 200)
    }
    else {
      return c.json({ success: false, message: 'Authentication failed' }, 401)
    }

  })

  app.get('/auth/logout', async (c) => {
    const token = c.get('user');

    const successful = await cms.auth.logout(token);
    if (successful) {
      deleteCookie(c, "auth")
    }
    return c.json({success: successful})
  })

  createGraphQLApiRoute(cms, app);

  showRoutes(app, {
    verbose: true,
  })

  return app;
}

export { CMS } from './core/cms';
