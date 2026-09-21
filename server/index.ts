import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { db } from "./db";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { startButlerScheduler } from "./lib/butler-scheduler";

process.on('uncaughtException', (err) => {
  if (err.message?.includes('terminating connection due to administrator command')) {
    console.warn('Database connection terminated (expected during deployment restarts)');
    return;
  }
  console.error('Uncaught exception:', err);
});

if (process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (process.env.SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_ANON_KEY;
}

const app = express();

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK: req.body is not a Buffer — webhook route must be before express.json()');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Svix signs the raw request bytes, so the Resend webhook must see the Buffer
// body — mount express.raw for this path before express.json(), like Stripe.
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).slice(0, 80)}`;
      }
      log(logLine);
    }
  });

  next();
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set — skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    if (domains.length > 0) {
      const webhookBaseUrl = `https://${domains[0]}`;
      console.log('Setting up managed webhook...');
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        const webhookUrl = result?.webhook?.url || result?.url || webhookBaseUrl + '/api/stripe/webhook';
        console.log(`Webhook configured: ${webhookUrl}`);
      } catch (webhookErr: any) {
        console.warn('Webhook setup warning (non-fatal):', webhookErr.message);
      }
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

(async () => {
  // Belt-and-braces migrations: Railway's preDeployCommand is not reliably
  // running drizzle-kit migrate, so apply pending migrations at boot too.
  // Idempotent via drizzle's __drizzle_migrations bookkeeping.
  try {
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "migrations") });
    log("database migrations up to date");
  } catch (err) {
    console.error("Migration run failed (continuing boot):", err);
  }

  await registerRoutes(app);

  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  const stopButlerScheduler = startButlerScheduler(db);
  process.on("SIGTERM", stopButlerScheduler);
  process.on("SIGINT", stopButlerScheduler);

  initStripe().then(() => {
    setTimeout(() => {
      fetch(`http://0.0.0.0:${port}/api/shop/curated`)
        .then(() => console.log('Shop cache pre-warmed'))
        .catch(() => {});
    }, 1000);
  }).catch(err => console.error('Stripe init error:', err));
})();
