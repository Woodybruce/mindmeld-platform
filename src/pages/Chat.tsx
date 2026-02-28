import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { apiInvoke } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import CallScreen from "@/components/chat/CallScreen";
import IncomingCall from "@/components/chat/IncomingCall";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string | null;
  read: boolean;
  created_at: string;
  reply_to_id: string | null;
  message_type: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { user, profile, partnerOnline } = useAuth();
  const { addEvent } = useCalendarEvents();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");
  const [partnerPhone, setPartnerPhone] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const partnerId = profile?.partner_id;

  const { partnerTyping, sendTyping, sendStopTyping } = useTypingIndicator(user?.id, partnerId || undefined);

  const webrtc = useWebRTC({
    userId: user?.id,
    partnerId: partnerId || undefined,
    partnerName,
  });

  // Fetch partner name
  useEffect(() => {
    if (!partnerId) return;
    supabase.from("profiles").select("*").eq("id", partnerId).single()
      .then(({ data }) => {
        if (data?.username) setPartnerName(data.username);
      });
  }, [partnerId]);

  // Fetch partner phone from current user's profile (user stores their partner's number)
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.phone_number) setPartnerPhone(data.phone_number);
      });
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!user || !partnerId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .neq("message_type", "vibe")
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    };

    fetchMessages();

    // Mark unread as read
    supabase.from("messages").update({ read: true })
      .eq("receiver_id", user.id).eq("sender_id", partnerId).eq("read", false).then();

    // Realtime
    const channel = supabase
      .channel("chat-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (
          msg.message_type !== "vibe" &&
          ((msg.sender_id === user.id && msg.receiver_id === partnerId) ||
          (msg.sender_id === partnerId && msg.receiver_id === user.id))
        ) {
          setMessages((prev) => [...prev, msg]);
          if (msg.receiver_id === user.id) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then();
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, read: updated.read } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadAudio = async (blob: Blob): Promise<string | null> => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}.webm`;
    const { error } = await supabase.storage.from("voice-notes").upload(path, blob);
    if (error) return null;
    return supabase.storage.from("voice-notes").getPublicUrl(path).data.publicUrl;
  };

  const handleDelete = useCallback(async (msgId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) {
      toast.error("Failed to delete message");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  }, []);

  const handleReact = useCallback((msgId: string, emoji: string) => {
    setReactions((prev) => {
      const updated = { ...prev, [msgId]: prev[msgId] === emoji ? "" : emoji };
      localStorage.setItem("us-chat-reactions", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load reactions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("us-chat-reactions");
    if (stored) setReactions(JSON.parse(stored));
  }, []);

  const handleSend = async (content: string, imageFiles?: File[] | null, audioBlob?: Blob | null, galleryImageUrl?: string | null) => {
    if (!user || !partnerId || sending) return;
    setSending(true);

    try {
      let audioUrl: string | null = null;
      let messageType = "text";

      if (audioBlob) {
        audioUrl = await uploadAudio(audioBlob);
        messageType = "voice";
      }

      // If multiple images, send each as a separate message
      if (imageFiles && imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = file.name.split(".").pop();
          const storagePath = `${user.id}/${Date.now()}-${i}.${ext}`;
          const { error } = await supabase.storage.from("chat-images").upload(storagePath, file);
          if (!error) {
            const imageUrl = supabase.storage.from("chat-images").getPublicUrl(storagePath).data.publicUrl;
            await supabase.from("messages").insert({
              sender_id: user.id,
              receiver_id: partnerId,
              content: i === 0 && content ? content : "📷 Photo",
              image_url: imageUrl,
              reply_to_id: i === 0 ? (replyingTo?.id || null) : null,
              message_type: "image",
            } as any);
          }
        }
      } else if (galleryImageUrl) {
        await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: partnerId,
          content: content || "📷 Photo",
          image_url: galleryImageUrl,
          reply_to_id: replyingTo?.id || null,
          message_type: "image",
        } as any);
      } else {
        await supabase.from("messages").insert({
          sender_id: user.id,
          receiver_id: partnerId,
          content: content || (audioUrl ? "🎤 Voice message" : ""),
          image_url: audioUrl,
          reply_to_id: replyingTo?.id || null,
          message_type: audioUrl ? "voice" : messageType,
        } as any);
      }

      setReplyingTo(null);

      // Send push notification when partner may not have the app open
      if (!partnerOnline) {
        const displayContent = audioBlob
          ? "🎤 Voice message"
          : imageFiles && imageFiles.length > 0
          ? "📷 Photo"
          : galleryImageUrl
          ? "📷 Photo"
          : content;
        try {
          await apiInvoke("send-push-notification", {
            body: {
              recipientUserId: partnerId,
              title: profile?.username || "Your partner",
              body: displayContent || "New message",
              data: { route: "/chat" },
            },
          });
        } catch (e) {
          console.warn("Chat push notification failed:", e);
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendSpecial = async (type: string, data: any) => {
    if (!user || !partnerId) return;
    // For polls, initialize votes object; for locations, add sentAt timestamp
    let payload = data;
    if (type === "poll") payload = { ...data, votes: {} };
    if (type === "location") payload = { ...data, sentAt: new Date().toISOString() };
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: JSON.stringify(payload),
      message_type: type,
    } as any);

    // Push notification for special messages
    if (!partnerOnline) {
      const labels: Record<string, string> = { poll: "📊 Poll", location: "📍 Location", event: "📅 Event", sticker: "😄 Sticker", spotify: "🎵 Song" };
      try {
        await apiInvoke("send-push-notification", {
          body: {
            recipientUserId: partnerId,
            title: profile?.username || "Your partner",
            body: labels[type] || "New message",
            data: { route: "/chat" },
          },
        });
      } catch (e) {
        console.warn("Special message push failed:", e);
      }
    }
  };

  const handlePollVote = async (msgId: string, optionIdx: number) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    try {
      const parsed = JSON.parse(msg.content);
      const votes: Record<number, string[]> = parsed.votes || {};
      // Check if already voted
      const alreadyVoted = Object.values(votes).flat().includes(user.id);
      if (alreadyVoted) return;
      votes[optionIdx] = [...(votes[optionIdx] || []), user.id];
      const updatedContent = JSON.stringify({ ...parsed, votes });
      await supabase.from("messages").update({ content: updatedContent } as any).eq("id", msgId);
      // Optimistic update
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: updatedContent } : m));
    } catch { /* ignore parse errors */ }
  };

  const handleReply = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    setReplyingTo({
      id: msg.id,
      content: msg.content,
      senderName: msg.sender_id === user?.id ? "You" : partnerName,
    });
  };

  const handleSavePollToList = useCallback((question: string, options: string[]) => {
    const stored = localStorage.getItem("us-shared-lists");
    const lists = stored ? JSON.parse(stored) : [];
    const newList = {
      id: Date.now().toString(),
      name: question,
      icon: "📊",
      createdAt: new Date().toISOString(),
      items: options.map((text, i) => ({ id: `${Date.now()}-${i}`, text, done: false })),
    };
    const updated = [newList, ...lists];
    localStorage.setItem("us-shared-lists", JSON.stringify(updated));
  }, []);

  const handleSaveEventToCalendar = useCallback(async (event: { title: string; date: string; time?: string; location?: string }) => {
    try {
      const startTime = event.time
        ? new Date(`${event.date}T${event.time}`).toISOString()
        : new Date(`${event.date}T00:00`).toISOString();
      const endTime = event.time
        ? new Date(new Date(`${event.date}T${event.time}`).getTime() + 3600000).toISOString()
        : new Date(`${event.date}T23:59`).toISOString();
      await addEvent({
        subject: event.title,
        start_time: startTime,
        end_time: endTime,
        is_all_day: !event.time,
        location: event.location,
      });
    } catch (err) {
      console.error("Failed to save event to calendar:", err);
    }
  }, [addEvent]);

  // Empty states
  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
        <header className="sticky top-0 z-50 bg-[hsl(var(--us-navy))] text-white safe-area-top">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full flex items-center justify-center text-white/80">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-body text-sm font-semibold">Chat</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p className="text-lg font-display font-semibold text-foreground">Sign in to chat</p>
            <p className="text-sm text-muted-foreground">Log in to start messaging your partner</p>
          </div>
        </main>
      </div>
    );
  }

  if (!partnerId) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
        <ChatHeader partnerName="Chat" />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p className="text-lg font-display font-semibold text-foreground">Link your partner first</p>
            <p className="text-sm text-muted-foreground">Go to Profile and enter your partner's email</p>
            <button onClick={() => navigate("/profile")} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
              Go to Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" });
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  // Build reply lookup
  const msgMap = new Map(messages.map((m) => [m.id, m]));

  return (
    <div className="h-[100dvh] max-w-lg mx-auto relative flex flex-col overflow-hidden bg-background">
      {/* Clean iMessage-style background */}
      <div className="fixed inset-0 max-w-lg mx-auto pointer-events-none bg-background" />
      
      <ChatHeader
        partnerName={partnerName}
        isOnline={partnerOnline}
        partnerPhone={partnerPhone}
        onStartCall={webrtc.startCall}
      />

      {/* Call overlays */}
      <AnimatePresence>
        {webrtc.incomingCall && webrtc.callState === "ringing" && (
          <IncomingCall
            callerName={webrtc.incomingCall.from}
            callType={webrtc.incomingCall.type}
            onAccept={webrtc.acceptCall}
            onReject={webrtc.rejectCall}
          />
        )}
        {(webrtc.callState === "calling" || webrtc.callState === "connected") && (
          <CallScreen
            callState={webrtc.callState}
            callType={webrtc.callType}
            partnerName={partnerName}
            isMuted={webrtc.isMuted}
            isVideoOff={webrtc.isVideoOff}
            callDuration={webrtc.callDuration}
            localVideoRef={webrtc.localVideoRef}
            remoteVideoRef={webrtc.remoteVideoRef}
            onEndCall={webrtc.endCall}
            onToggleMute={webrtc.toggleMute}
            onToggleVideo={webrtc.toggleVideo}
          />
        )}
      </AnimatePresence>

      <main className="flex-1 px-3 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-4 overflow-y-auto space-y-0 relative z-10">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center pt-20">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-us-blush/30 to-us-coral/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p className="font-display text-lg font-semibold text-foreground">Start the conversation</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-[220px] mx-auto">
                Send a message, photo, or GIF to your partner 💕
              </p>
            </div>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-3">
              <span className="text-[11px] font-medium text-muted-foreground bg-secondary/80 backdrop-blur-md px-3.5 py-1 rounded-full">
                {group.date}
              </span>
            </div>
            <AnimatePresence>
              {group.msgs.map((msg, idx) => {
                const isMine = msg.sender_id === user.id;
                const time = new Date(msg.created_at).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });
                const replyMsg = msg.reply_to_id ? msgMap.get(msg.reply_to_id) : null;
                const replyTo = replyMsg
                  ? { content: replyMsg.content, senderName: replyMsg.sender_id === user.id ? "You" : partnerName }
                  : null;

                // iMessage-style grouping: consecutive messages from same sender
                const prevMsg = group.msgs[idx - 1];
                const nextMsg = group.msgs[idx + 1];
                const sameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id;
                const sameSenderAsNext = nextMsg && nextMsg.sender_id === msg.sender_id;
                const isLastInGroup = !sameSenderAsNext;
                const isFirstInGroup = !sameSenderAsPrev;

                return (
                  <ChatBubble
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    imageUrl={msg.message_type === "voice" ? null : msg.image_url}
                    audioUrl={msg.message_type === "voice" ? msg.image_url : null}
                    isMine={isMine}
                    time={time}
                    read={msg.read}
                    messageType={msg.message_type}
                    replyTo={replyTo}
                    onSwipeReply={handleReply}
                    onPollVote={handlePollVote}
                    onSavePollToList={handleSavePollToList}
                    onSaveEventToCalendar={handleSaveEventToCalendar}
                    onDelete={handleDelete}
                    onReact={handleReact}
                    reaction={reactions[msg.id] || null}
                    userId={user.id}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ))}
        {/* Typing indicator */}
        {partnerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex justify-start mb-1"
          >
            <div className="bg-secondary rounded-[20px] rounded-bl-[6px] px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-1">
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-muted-foreground/50"
                />
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-muted-foreground/50"
                />
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-muted-foreground/50"
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </main>

      <ChatInput
        onSend={handleSend}
        onSendSpecial={handleSendSpecial}
        onSaveInstagramLink={async (url) => {
          if (!user) return;
          const { error } = await supabase.from("shared_links").insert({
            user_id: user.id,
            url,
            platform: "Instagram",
            title: "Instagram Post",
          });
          if (error) {
            toast.error("Failed to save link");
          } else {
            toast.success("Saved to shared links! 📸");
          }
        }}
        sending={sending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onTyping={sendTyping}
        onStopTyping={sendStopTyping}
      />
    </div>
  );
};

export default Chat;
