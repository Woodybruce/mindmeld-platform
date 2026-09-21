import { describe, it, expect } from 'vitest';
import { buildEventInvite } from '../lib/ics';

const EVENT = {
  title: 'Science Museum trip',
  startsAt: new Date('2026-09-26T09:00:00.000Z'),
  endsAt: new Date('2026-09-26T12:30:00.000Z'),
  location: 'Exhibition Road, London',
  description: 'Bring packed lunch',
  attendees: ['mum@example.com', 'dad@example.com'],
  uid: 'fixed-uid-123@bruces.app',
};

describe('buildEventInvite', () => {
  it('builds a valid METHOD:REQUEST VCALENDAR with a single VEVENT', () => {
    const ics = buildEventInvite(EVENT);
    const lines = ics.split('\r\n');

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines).toContain('METHOD:REQUEST');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('CALSCALE:GREGORIAN');
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain('END:VEVENT');
    expect(lines).toContain('UID:fixed-uid-123@bruces.app');
    expect(lines).toContain('DTSTART:20260926T090000Z');
    expect(lines).toContain('DTEND:20260926T123000Z');
    expect(lines).toContain('SUMMARY:Science Museum trip');
    expect(lines).toContain('LOCATION:Exhibition Road\\, London');
    expect(lines).toContain('DESCRIPTION:Bring packed lunch');
    expect(lines).toContain('ORGANIZER:mailto:butler@bruces.app');
    // DTSTAMP in UTC basic format.
    expect(lines.some((l) => /^DTSTAMP:\d{8}T\d{6}Z$/.test(l))).toBe(true);
    // VEVENT sits inside the VCALENDAR.
    expect(lines.indexOf('BEGIN:VEVENT')).toBeGreaterThan(lines.indexOf('BEGIN:VCALENDAR'));
    expect(lines.indexOf('END:VEVENT')).toBeLessThan(lines.indexOf('END:VCALENDAR'));
  });

  it('emits one ATTENDEE line per recipient', () => {
    // ATTENDEE lines exceed 75 octets and are folded; unfold first.
    const unfolded = buildEventInvite(EVENT).replace(/\r\n /g, '');
    const attendees = unfolded.split('\r\n').filter((l) => l.startsWith('ATTENDEE'));
    expect(attendees).toEqual([
      'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:mum@example.com',
      'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:dad@example.com',
    ]);
  });

  it('generates a bruces.app UID when none is given', () => {
    const { uid, ...rest } = EVENT;
    const ics = buildEventInvite(rest);
    const uidLine = ics.split('\r\n').find((l) => l.startsWith('UID:'));
    expect(uidLine).toMatch(/^UID:[0-9a-f-]{36}@bruces\.app$/);
  });

  it('escapes commas, semicolons, backslashes and newlines per RFC 5545', () => {
    const ics = buildEventInvite({
      title: 'Milk, eggs; bread \\ butter\nthen home',
      startsAt: EVENT.startsAt,
      endsAt: EVENT.endsAt,
      attendees: [],
      uid: 'esc@bruces.app',
    });
    expect(ics).toContain('SUMMARY:Milk\\, eggs\\; bread \\\\ butter\\nthen home');
  });

  it('omits LOCATION and DESCRIPTION when not provided', () => {
    const ics = buildEventInvite({
      title: 'Plain',
      startsAt: EVENT.startsAt,
      endsAt: EVENT.endsAt,
      attendees: [],
      uid: 'plain@bruces.app',
    });
    expect(ics).not.toContain('LOCATION:');
    expect(ics).not.toContain('DESCRIPTION:');
  });

  it('folds lines longer than 75 octets with CRLF + space, without splitting UTF-8', () => {
    const ics = buildEventInvite({
      title: `A very long event title that keeps going ☕ and going and going past the limit`,
      startsAt: EVENT.startsAt,
      endsAt: EVENT.endsAt,
      attendees: [],
      uid: 'fold@bruces.app',
    });
    const lines = ics.split('\r\n');
    for (const line of lines) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    const summaryIndex = lines.findIndex((l) => l.startsWith('SUMMARY:'));
    expect(summaryIndex).toBeGreaterThan(-1);
    // At least one continuation line follows, starting with a single space.
    expect(lines[summaryIndex + 1].startsWith(' ')).toBe(true);
    // Unfolded, the escaped text round-trips intact.
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(
      'SUMMARY:A very long event title that keeps going ☕ and going and going past the limit',
    );
  });
});
