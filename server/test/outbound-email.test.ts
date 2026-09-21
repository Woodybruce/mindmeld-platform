import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  sendButlerEmail,
  butlerNotifyEmails,
  type FetchLike,
  type FetchResponseLike,
} from '../lib/outbound-email';

function okResponse(): FetchResponseLike {
  return { ok: true, status: 200, text: async () => '{"id":"em_1"}' };
}

// Captures the request for assertions while pretending to be Resend.
function fakeFetch(response: FetchResponseLike = okResponse()) {
  const calls: { url: string; init: Parameters<FetchLike>[1] }[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return { impl, calls };
}

const EVENT = {
  title: 'Science Museum trip',
  startsAt: new Date('2026-09-26T09:00:00.000Z'),
  endsAt: new Date('2026-09-26T12:30:00.000Z'),
  location: 'Exhibition Road, London',
  attendees: ['mum@example.com'],
};

describe('sendButlerEmail', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.BUTLER_NOTIFY_EMAILS;
    vi.restoreAllMocks();
  });

  it('posts the expected payload to Resend and returns true', async () => {
    const { impl, calls } = fakeFetch();
    const sent = await sendButlerEmail(
      { to: ['mum@example.com'], subject: 'Hello', text: 'Hi there' },
      impl,
    );
    expect(sent).toBe(true);
    expect(calls).toHaveLength(1);

    const { url, init } = calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body.from).toBe('Butler <butler@bruces.app>');
    expect(body.to).toEqual(['mum@example.com']);
    expect(body.subject).toBe('Hello');
    expect(body.text).toBe('Hi there');
    expect(body.attachments).toBeUndefined();
  });

  it('attaches a base64 invite.ics when an event is given, addressed to the recipients', async () => {
    const { impl, calls } = fakeFetch();
    const sent = await sendButlerEmail(
      { to: ['mum@example.com', 'dad@example.com'], subject: '📅 Trip', text: 'Invite attached', icsEvent: EVENT },
      impl,
    );
    expect(sent).toBe(true);

    const body = JSON.parse(calls[0].init.body) as {
      attachments: { filename: string; content: string }[];
    };
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].filename).toBe('invite.ics');

    // Unfold long lines (ATTENDEE lines exceed 75 octets) before asserting.
    const ics = Buffer.from(body.attachments[0].content, 'base64')
      .toString('utf8')
      .replace(/\r\n /g, '');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Science Museum trip');
    expect(ics).toContain('DTSTART:20260926T090000Z');
    // Attendees come from the recipient list, not the event's own attendees.
    expect(ics).toContain('mailto:mum@example.com');
    expect(ics).toContain('mailto:dad@example.com');
  });

  it('returns false without calling fetch when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const { impl, calls } = fakeFetch();
    const sent = await sendButlerEmail({ to: ['mum@example.com'], subject: 'x', text: 'x' }, impl);
    expect(sent).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('returns false when the recipient list is empty', async () => {
    const { impl, calls } = fakeFetch();
    expect(await sendButlerEmail({ to: [], subject: 'x', text: 'x' }, impl)).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('returns false (never throws) when the API responds with an error', async () => {
    const { impl } = fakeFetch({ ok: false, status: 422, text: async () => '{"error":"bad"}' });
    const sent = await sendButlerEmail({ to: ['mum@example.com'], subject: 'x', text: 'x' }, impl);
    expect(sent).toBe(false);
  });

  it('returns false (never throws) when fetch rejects', async () => {
    const impl: FetchLike = async () => {
      throw new Error('network down');
    };
    const sent = await sendButlerEmail({ to: ['mum@example.com'], subject: 'x', text: 'x' }, impl);
    expect(sent).toBe(false);
  });
});

describe('butlerNotifyEmails', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.BUTLER_NOTIFY_EMAILS;
    vi.restoreAllMocks();
  });

  it('parses a comma-separated list, trimming whitespace and dropping empties', () => {
    process.env.BUTLER_NOTIFY_EMAILS = ' mum@example.com ,dad@example.com,,  ';
    expect(butlerNotifyEmails()).toEqual(['mum@example.com', 'dad@example.com']);
  });

  it('returns an empty list when unset', () => {
    expect(butlerNotifyEmails()).toEqual([]);
  });
});
