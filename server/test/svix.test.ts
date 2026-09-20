import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifySvixSignature } from '../lib/svix';

const SECRET_BYTES = Buffer.from('testsecret');
const SECRET = 'whsec_' + SECRET_BYTES.toString('base64');
const BODY = Buffer.from('{"a":1}');
const ID = 'msg_1';

function sign(id: string, timestamp: string, body: Buffer): string {
  const content = `${id}.${timestamp}.${body.toString('utf8')}`;
  return crypto.createHmac('sha256', SECRET_BYTES).update(content).digest('base64');
}

function nowTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

describe('verifySvixSignature', () => {
  it('accepts a correctly signed payload', () => {
    const ts = nowTimestamp();
    const signature = `v1,${sign(ID, ts, BODY)}`;
    expect(verifySvixSignature(BODY, { id: ID, timestamp: ts, signature }, SECRET)).toBe(true);
  });

  it('accepts when any of several space-separated signatures matches', () => {
    const ts = nowTimestamp();
    const good = sign(ID, ts, BODY);
    const signature = `v1,${Buffer.from('bogus').toString('base64')} v1,${good}`;
    expect(verifySvixSignature(BODY, { id: ID, timestamp: ts, signature }, SECRET)).toBe(true);
  });

  it('rejects a signature computed over a different body', () => {
    const ts = nowTimestamp();
    const signature = `v1,${sign(ID, ts, Buffer.from('{"a":2}'))}`;
    expect(verifySvixSignature(BODY, { id: ID, timestamp: ts, signature }, SECRET)).toBe(false);
  });

  it('rejects a timestamp outside the 5-minute tolerance', () => {
    const ts = '1000000000';
    const signature = `v1,${sign(ID, ts, BODY)}`;
    expect(verifySvixSignature(BODY, { id: ID, timestamp: ts, signature }, SECRET)).toBe(false);
  });

  it('rejects when headers are missing', () => {
    const ts = nowTimestamp();
    const signature = `v1,${sign(ID, ts, BODY)}`;
    expect(verifySvixSignature(BODY, {}, SECRET)).toBe(false);
    expect(verifySvixSignature(BODY, { timestamp: ts, signature }, SECRET)).toBe(false);
    expect(verifySvixSignature(BODY, { id: ID, signature }, SECRET)).toBe(false);
    expect(verifySvixSignature(BODY, { id: ID, timestamp: ts }, SECRET)).toBe(false);
  });

  it('rejects a tampered signature of the wrong length without throwing', () => {
    const ts = nowTimestamp();
    expect(verifySvixSignature(BODY, { id: ID, timestamp: ts, signature: 'v1,AAAA' }, SECRET)).toBe(false);
  });
});
