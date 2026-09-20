import { describe, it, expect, afterEach } from 'vitest';
import { extractActions, ButlerParseError } from '../lib/butler-extract';
import { fetchReceivedEmail } from '../lib/resend';

const HARRODIAN_EMAIL = {
  from: 'admissions@harrodianschool.com',
  subject: 'Thank you for visiting The Harrodian School',
  text: [
    'Dear Mr and Mrs Bruce,',
    '',
    'Thank you for joining us for the tour of The Harrodian School last week.',
    'It was a pleasure to meet you and show you around our Pre-Prep and Prep departments.',
    '',
    'To proceed with an application, please complete the registration checklist on your OpenApply profile:',
    'https://harrodianschool.openapply.com/students/9698020/profile',
    '',
    'Kind regards,',
    'The Admissions Team',
  ].join('\n'),
};

const MODEL_REPLY = JSON.stringify({
  summary: 'Harrodian admissions thank-you email with a registration checklist link.',
  actions: [
    {
      type: 'create_task',
      title: 'Complete Harrodian registration checklist',
      notes: 'Registration checklist at https://harrodianschool.openapply.com/students/9698020/profile',
    },
    {
      type: 'remember',
      key: 'harrodian_openapply_profile',
      value: 'https://harrodianschool.openapply.com/students/9698020/profile',
    },
  ],
});

describe('extractActions', () => {
  it('parses a valid model reply into a proposal payload', async () => {
    const payload = await extractActions(HARRODIAN_EMAIL, async () => MODEL_REPLY);

    expect(payload.summary).toContain('Harrodian');
    expect(payload.actions).toHaveLength(2);
    expect(payload.actions[0]).toMatchObject({
      type: 'create_task',
      title: 'Complete Harrodian registration checklist',
    });
    expect(payload.actions[1]).toMatchObject({
      type: 'remember',
      key: 'harrodian_openapply_profile',
      value: 'https://harrodianschool.openapply.com/students/9698020/profile',
    });
  });

  it('throws ButlerParseError when the model reply is not JSON', async () => {
    await expect(extractActions(HARRODIAN_EMAIL, async () => 'not json'))
      .rejects.toBeInstanceOf(ButlerParseError);
  });

  it('throws ButlerParseError when the model reply fails schema validation', async () => {
    const badReply = JSON.stringify({ summary: 'ok', actions: [{ type: 'unknown_thing' }] });
    await expect(extractActions(HARRODIAN_EMAIL, async () => badReply))
      .rejects.toBeInstanceOf(ButlerParseError);
  });
});

describe('fetchReceivedEmail', () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it('throws when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(fetchReceivedEmail('email_123')).rejects.toThrow(/RESEND_API_KEY/);
  });
});
