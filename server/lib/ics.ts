// Minimal hand-rolled ICS (RFC 5545) builder for diary invites. No dependency:
// the events the butler sends only need a single VEVENT inside a
// METHOD:REQUEST VCALENDAR.
import crypto from 'node:crypto';

export interface IcsEvent {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  description?: string;
  attendees: string[];
  uid?: string;
}

// RFC 5545 §3.3.11: UTC basic format, e.g. 20260920T090000Z.
function utcStamp(at: Date): string {
  return at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// RFC 5545 §3.1: TEXT values escape backslash, semicolon, comma and newlines.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

// RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space.
// Byte-aware so multi-byte UTF-8 sequences are never split.
function foldLine(line: string): string {
  const bytes = Buffer.byteLength(line, 'utf8');
  if (bytes <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  // First line holds 75 octets, continuation lines hold 74 (+ leading space).
  let limit = 75;
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += charBytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildEventInvite(event: IcsEvent): string {
  const uid = event.uid ?? `${crypto.randomUUID()}@bruces.app`;
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//bruces.app//Butler//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(event.startsAt)}`,
    `DTEND:${utcStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  lines.push('ORGANIZER:mailto:butler@bruces.app');
  for (const attendee of event.attendees) {
    lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
