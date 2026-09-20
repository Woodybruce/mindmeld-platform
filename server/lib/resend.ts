// Fetches the full content of an inbound email from Resend's receiving API.
// The Svix webhook only carries metadata, so the body is fetched on demand.

export interface ReceivedEmail {
  from: string;
  subject: string;
  text: string;
}

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error [${response.status}]: ${body}`);
  }

  const data = (await response.json()) as { from: string; subject?: string; text?: string };
  return {
    from: data.from,
    subject: data.subject ?? "",
    text: data.text ?? "",
  };
}
