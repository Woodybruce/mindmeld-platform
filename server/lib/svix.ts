import crypto from 'node:crypto';

export interface SvixHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export function verifySvixSignature(
  rawBody: Buffer,
  headers: SvixHeaders,
  secret: string,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const content = `${id}.${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(content).digest();

  for (const part of signature.split(' ')) {
    const [version, sig] = part.split(',', 2);
    if (version !== 'v1' || !sig) continue;
    const candidate = Buffer.from(sig, 'base64');
    if (candidate.length !== expected.length) continue;
    if (crypto.timingSafeEqual(candidate, expected)) return true;
  }
  return false;
}
