// Outbound butler email via Resend's send API. Graceful by contract: a
// missing API key or an API failure logs and returns false — callers are
// fire-and-forget notification paths that must never break.
// fetchImpl is injectable so tests never hit the network (same pattern as
// extractActions' injectable callModel).
import { buildEventInvite, type IcsEvent } from './ics';

export interface SendButlerEmailOptions {
  to: string[];
  subject: string;
  text: string;
  icsEvent?: IcsEvent;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type FetchLike = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body: string;
}) => Promise<FetchResponseLike>;

const FROM = 'Butler <butler@bruces.app>';
const SEND_URL = 'https://api.resend.com/emails';

let loggedMissingKey = false;
let loggedNoRecipients = false;

// Recipients for butler notifications, from BUTLER_NOTIFY_EMAILS
// (comma-separated). Empty when unset — callers then skip sending.
export function butlerNotifyEmails(): string[] {
  const list = (process.env.BUTLER_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (list.length === 0 && !loggedNoRecipients) {
    loggedNoRecipients = true;
    console.warn('BUTLER_NOTIFY_EMAILS is not set; skipping butler notification emails');
  }
  return list;
}

export async function sendButlerEmail(
  opts: SendButlerEmailOptions,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!loggedMissingKey) {
      loggedMissingKey = true;
      console.warn('RESEND_API_KEY is not set; skipping butler outbound email');
    }
    return false;
  }
  if (opts.to.length === 0) return false;

  const payload: {
    from: string;
    to: string[];
    subject: string;
    text: string;
    attachments?: { filename: string; content: string }[];
  } = {
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  };
  if (opts.icsEvent) {
    const ics = buildEventInvite({ ...opts.icsEvent, attendees: opts.to });
    payload.attachments = [
      { filename: 'invite.ics', content: Buffer.from(ics, 'utf8').toString('base64') },
    ];
  }

  try {
    const res = await fetchImpl(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend send failed [${res.status}]: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend send failed', err);
    return false;
  }
}
