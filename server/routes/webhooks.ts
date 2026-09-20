import { Router, type Request } from 'express';
import { and, eq } from 'drizzle-orm';
// Explicit `/index`: bare `../../shared/schema` resolves to the legacy shared/schema.ts file.
import { butlerProposals, channelMessages, channels } from '../../shared/schema/index';
import { verifySvixSignature } from '../lib/svix';
import { fetchReceivedEmail, type ReceivedEmail } from '../lib/resend';
import { extractActions, type InboundEmail } from '../lib/butler-extract';
import type { ProposalPayload } from '../../shared/validation/proposals';
import type { Database } from '../db';

export interface WebhookDeps {
  fetchReceivedEmail: (emailId: string) => Promise<ReceivedEmail>;
  extractActions: (email: InboundEmail) => Promise<ProposalPayload>;
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

// Finds (or creates, mirroring household creation) the household's shared
// butler channel.
async function householdChannelId(db: Database, householdId: string): Promise<string> {
  const [existing] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.householdId, householdId), eq(channels.type, 'household')));
  if (existing) return existing.id;
  const [created] = await db.insert(channels).values({ householdId, type: 'household' }).returning();
  return created.id;
}

async function postButlerMessage(db: Database, householdId: string, body: string): Promise<void> {
  const channelId = await householdChannelId(db, householdId);
  await db.insert(channelMessages).values({ channelId, senderUserId: null, body });
}

export function webhooksRouter(
  db: Database,
  deps: WebhookDeps = { fetchReceivedEmail, extractActions },
): Router {
  const router = Router();

  // Mounted at /api/webhooks with express.raw() in server/index.ts (before
  // express.json), so req.body is the raw Buffer that svix signed.
  router.post('/resend', async (req, res) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const raw = Buffer.isBuffer(req.body) ? req.body : undefined;
    const verified =
      secret &&
      raw &&
      verifySvixSignature(
        raw,
        {
          id: header(req, 'svix-id'),
          timestamp: header(req, 'svix-timestamp'),
          signature: header(req, 'svix-signature'),
        },
        secret,
      );
    if (!verified) return res.status(401).json({ error: 'invalid_signature' });

    let event: { type?: string; data?: { email_id?: string } };
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'invalid_body' });
    }

    if (event.type !== 'email.received') return res.status(200).json({ ignored: true });

    const householdId = process.env.BUTLER_HOUSEHOLD_ID;
    if (!householdId) return res.status(503).json({ error: 'butler_not_configured' });

    // Always 200 from here on: Resend retries on non-2xx, and duplicate
    // deliveries are acceptable in v1.
    let email: ReceivedEmail | undefined;
    try {
      email = await deps.fetchReceivedEmail(event.data?.email_id ?? '');
      const payload = await deps.extractActions(email);
      await db.insert(butlerProposals).values({
        householdId,
        source: 'email',
        sender: email.from,
        subject: email.subject,
        payload,
        status: 'pending',
      });
      await postButlerMessage(
        db,
        householdId,
        `📧 ${email.subject}\nFrom: ${email.from}\n${payload.summary}\nProposed: ${payload.actions.length} action(s) — review in the Butler inbox on Home.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.insert(butlerProposals).values({
        householdId,
        source: 'email',
        sender: email?.from,
        subject: email?.subject,
        payload: null,
        status: 'error',
        error: message,
      });
      await postButlerMessage(
        db,
        householdId,
        `I received an email from ${email?.from ?? 'unknown sender'} (${email?.subject ?? 'no subject'}) but couldn't parse it`,
      );
    }
    return res.status(200).json({ received: true });
  });

  return router;
}
