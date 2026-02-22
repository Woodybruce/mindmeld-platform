import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget push notification + optional chat message to partner.
 */
export async function notifyPartner(opts: {
  partnerId: string;
  title: string;
  body: string;
  route?: string;
  chatMessage?: string;
  senderId?: string;
}) {
  const { partnerId, title, body, route, chatMessage, senderId } = opts;

  // Push notification
  supabase.functions.invoke("send-push-notification", {
    body: {
      recipientUserId: partnerId,
      title,
      body,
      data: route ? { route } : undefined,
    },
  }).catch(() => {});

  // Optional chat message
  if (chatMessage && senderId) {
    supabase.from("messages").insert({
      sender_id: senderId,
      receiver_id: partnerId,
      content: chatMessage,
      message_type: "text",
    } as any).then(() => {});
  }
}
