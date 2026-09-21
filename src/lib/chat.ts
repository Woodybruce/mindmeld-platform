import { apiInvoke } from "@/lib/api";
import type {
  ChannelList,
  ChatMessage,
  HouseholdInfo,
  SendMessageInput,
} from "./chat-utils";

export type {
  ChannelList,
  ChatChannel,
  ChatMember,
  ChatMessage,
  HouseholdInfo,
  SendMessageInput,
} from "./chat-utils";

export async function fetchChannels(): Promise<ChannelList> {
  const { data, error } = await apiInvoke<ChannelList>("channels");
  if (error) throw error;
  return data ?? { channels: [], members: [] };
}

export async function fetchHousehold(): Promise<HouseholdInfo | null> {
  const { data, error } = await apiInvoke<HouseholdInfo>("household");
  if (error) throw error;
  return data;
}

export async function fetchMessages(channelId: string, after?: string): Promise<ChatMessage[]> {
  const { data, error } = await apiInvoke<ChatMessage[]>(
    `channels/${channelId}/messages`,
    after ? { query: { after } } : undefined,
  );
  if (error) throw error;
  return data ?? [];
}

export async function sendChannelMessage(
  channelId: string,
  input: SendMessageInput,
): Promise<ChatMessage | null> {
  const { data, error } = await apiInvoke<ChatMessage>(`channels/${channelId}/messages`, {
    method: "POST",
    body: input,
  });
  if (error) throw error;
  return data;
}

export async function markChannelRead(channelId: string): Promise<void> {
  const { error } = await apiInvoke<{ marked: number }>(`channels/${channelId}/read`, {
    method: "POST",
  });
  if (error) throw error;
}

// Latest butler-authored message (senderUserId null) in the household
// channel — the morning briefing / reminder shown on the Today page.
export async function fetchLatestButlerMessage(): Promise<ChatMessage | null> {
  const { channels } = await fetchChannels();
  const household = channels.find((c) => c.type === "household");
  if (!household) return null;
  const messages = await fetchMessages(household.id);
  const butlerMessages = messages.filter((m) => m.senderUserId === null);
  return butlerMessages[butlerMessages.length - 1] ?? null;
}

export async function uploadChatImage(userId: string, file: File): Promise<string> {
  const resp = await fetch("/api/upload-photo", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "x-user-id": userId,
      "x-bucket": "chat-images",
    },
    body: file,
  });
  const result = (await resp.json()) as { publicUrl?: string };
  if (!resp.ok || !result.publicUrl) throw new Error("Image upload failed");
  return result.publicUrl;
}
