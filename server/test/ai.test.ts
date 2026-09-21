import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { callAI } from '../lib/ai';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as Response;
}

function stubFetch(responses: Response[]) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  let i = 0;
  vi.stubGlobal('fetch', async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    const res = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return res;
  });
  return calls;
}

const MESSAGES = [{ role: 'user', content: 'hi' }];

describe('callAI', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_GATEWAY_URL;
    delete process.env.AI_MODEL;
    vi.unstubAllGlobals();
  });

  it('returns the parsed response on a normal 200, including temperature', async () => {
    const calls = stubFetch([jsonResponse({ choices: [{ message: { content: 'hello' } }] })]);
    const result = await callAI(MESSAGES, undefined, undefined, undefined, { temperature: 0.4 });
    expect(result).toEqual({ choices: [{ message: { content: 'hello' } }] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(calls[0].body.temperature).toBe(0.4);
    expect(calls[0].body.model).toBe('gpt-5.4');
  });

  it('retries once without temperature when a 400 body mentions temperature', async () => {
    const calls = stubFetch([
      jsonResponse({ error: { message: 'invalid temperature: only 1 is allowed for this model', type: 'invalid_request_error' } }, 400),
      jsonResponse({ choices: [{ message: { content: 'retried' } }] }),
    ]);
    const result = await callAI(MESSAGES, undefined, undefined, undefined, { temperature: 0.1 });
    expect(result).toEqual({ choices: [{ message: { content: 'retried' } }] });
    expect(calls).toHaveLength(2);
    expect(calls[0].body.temperature).toBe(0.1);
    expect(calls[1].body.temperature).toBeUndefined();
    expect(calls[1].body.model).toBe('gpt-5.4');
    expect(calls[1].body.messages).toEqual(MESSAGES);
  });

  it('throws on a 400 that does not mention temperature, without retrying', async () => {
    const calls = stubFetch([
      jsonResponse({ error: { message: 'model not found', type: 'invalid_request_error' } }, 400),
    ]);
    await expect(callAI(MESSAGES)).rejects.toThrow(/AI API error \[400\]/);
    expect(calls).toHaveLength(1);
  });

  it('does not retry when the retry itself fails with another 400', async () => {
    const calls = stubFetch([
      jsonResponse({ error: { message: 'invalid temperature' } }, 400),
      jsonResponse({ error: { message: 'still invalid temperature' } }, 400),
    ]);
    await expect(callAI(MESSAGES)).rejects.toThrow(/AI API error \[400\]/);
    expect(calls).toHaveLength(2);
  });

  it('still throws the typed 429 error without retrying', async () => {
    const calls = stubFetch([jsonResponse({ error: { message: 'rate limited' } }, 429)]);
    const err = await callAI(MESSAGES).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Rate limited');
    expect((err as { status: number }).status).toBe(429);
    expect(calls).toHaveLength(1);
  });
});
