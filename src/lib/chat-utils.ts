export interface ChatChannel {
  id: string;
  householdId: string;
  type: "dm" | "household";
  createdAt: string;
}

export interface ChatMember {
  id: string;
  householdId: string;
  userId: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export interface ChannelList {
  channels: ChatChannel[];
  members: ChatMember[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderUserId: string | null;
  body: string;
  replyToId: string | null;
  messageType: "text" | "image";
  imageUrl: string | null;
  readBy: string[];
  createdAt: string;
}

export interface SendMessageInput {
  body: string;
  senderUserId: string;
  replyToId?: string;
  messageType?: "text" | "image";
  imageUrl?: string;
}

export interface HouseholdInfo {
  id: string;
  name: string;
  createdAt: string;
}

export const isButlerAddressed = (body: string): boolean => /^\s*@?butler\b/i.test(body);

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

// WhatsApp-style per-sender name colours, stable by user id.
const SENDER_COLORS = [
  "text-emerald-600 dark:text-emerald-400",
  "text-sky-600 dark:text-sky-400",
  "text-orange-600 dark:text-orange-400",
  "text-pink-600 dark:text-pink-400",
  "text-indigo-600 dark:text-indigo-400",
];

export function senderColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

export interface RenderItem {
  kind: "divider" | "message";
  key: string;
  label?: string;
  message?: ChatMessage;
  isFirstInRun?: boolean;
  isLastInRun?: boolean;
}

// Flattens ascending messages into day dividers + bubbles, computing
// consecutive-sender run boundaries within each day.
export function buildRenderItems(messages: ChatMessage[], now = new Date()): RenderItem[] {
  const items: RenderItem[] = [];
  let lastDay = "";
  let dayRun: ChatMessage[] = [];

  const flushRun = () => {
    dayRun.forEach((m, i) => {
      const prev = dayRun[i - 1];
      const next = dayRun[i + 1];
      items.push({
        kind: "message",
        key: m.id,
        message: m,
        isFirstInRun: !prev || prev.senderUserId !== m.senderUserId,
        isLastInRun: !next || next.senderUserId !== m.senderUserId,
      });
    });
    dayRun = [];
  };

  for (const m of messages) {
    const label = dayLabel(m.createdAt, now);
    if (label !== lastDay) {
      flushRun();
      items.push({ kind: "divider", key: `day-${label}-${m.id}`, label });
      lastDay = label;
    }
    dayRun.push(m);
  }
  flushRun();
  return items;
}
