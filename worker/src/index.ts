import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { catalog } from './routes/catalog';
import { orders } from './routes/orders';
import { sweep } from './jobs/sweep';

const app = new Hono<{ Bindings: Env }>();

// The static site (GitHub Pages) lives on another origin, so allow exactly that one.
app.use('/api/*', (c, next) =>
  cors({ origin: c.env.ALLOWED_ORIGIN || '', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['content-type'] })(c, next));

app.route('/api/catalog', catalog);
app.route('/api/orders', orders);

app.get('/api/health', async c => {
  await c.env.DB.prepare('SELECT 1').first();
  return c.json({ ok: true });
});

app.notFound(c => c.json({ error: 'Not found' }, 404));

// Customers never see stack traces; log structured detail server-side only.
app.onError((err, c) => {
  const ref = crypto.randomUUID().slice(0, 8);
  console.error(JSON.stringify({ ref, path: c.req.path, message: err.message }));
  return c.json({ error: `Something went wrong. Reference ${ref}` }, 500);
});

export default {
  fetch: app.fetch,
  scheduled: (_e: ScheduledController, env: Env, ctx: ExecutionContext) => { ctx.waitUntil(sweep(env)); },
};
