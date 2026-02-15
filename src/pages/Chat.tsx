import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";

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
  const { user, profile } = useAuth();
  const { addEvent } = useCalendarEvents();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const partnerId = profile?.partner_id;

  // Fetch partner name
  useEffect(() => {
    if (!partnerId) return;
    supabase.from("profiles").select("username").eq("id", partnerId).single()
      .then(({ data }) => { if (data?.username) setPartnerName(data.username); });
  }, [partnerId]);

  // Fetch messages
  useEffect(() => {
    if (!user || !partnerId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
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
          (msg.sender_id === user.id && msg.receiver_id === partnerId) ||
          (msg.sender_id === partnerId && msg.receiver_id === user.id)
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


  const handleSend = async (content: string, imageFile?: File | null, audioBlob?: Blob | null, galleryImageUrl?: string | null) => {
    if (!user || !partnerId || sending) return;
    setSending(true);

    let imageUrl: string | null = null;
    let audioUrl: string | null = null;
    let messageType = "text";

    if (galleryImageUrl) {
      imageUrl = galleryImageUrl;
      messageType = "image";
    } else if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const storagePath = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(storagePath, imageFile);
      if (!error) {
        imageUrl = supabase.storage.from("chat-images").getPublicUrl(storagePath).data.publicUrl;
        messageType = "image";
      }
    }

    if (audioBlob) {
      audioUrl = await uploadAudio(audioBlob);
      messageType = "voice";
    }

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: content || (imageUrl ? "📷 Photo" : audioUrl ? "🎤 Voice message" : ""),
      image_url: imageUrl || audioUrl,
      reply_to_id: replyingTo?.id || null,
      message_type: messageType,
    } as any);

    setReplyingTo(null);
    setSending(false);
  };

  const handleSendSpecial = async (type: string, data: any) => {
    if (!user || !partnerId) return;
    // For polls, initialize votes object
    const payload = type === "poll" ? { ...data, votes: {} } : data;
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: JSON.stringify(payload),
      message_type: type,
    } as any);
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
  }, [addEvent]);

  // Empty states
  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
        <header className="sticky top-0 z-50 bg-[hsl(var(--us-navy))] text-primary-foreground">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground/80">
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
    <div className="min-h-screen max-w-lg mx-auto relative flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(var(--us-cream)) 0%, hsl(30 20% 93%) 100%)' }}>
      {/* Subtle wallpaper pattern */}
      <div className="fixed inset-0 max-w-lg mx-auto pointer-events-none opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      
      <ChatHeader partnerName={partnerName} />

      <main className="flex-1 px-3 py-3 overflow-y-auto pb-36 space-y-0.5 relative z-10">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center pt-20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Say something lovely 💕</p>
            </div>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-4">
              <span className="text-[11px] font-medium text-muted-foreground bg-card/90 backdrop-blur-md px-4 py-1.5 rounded-lg shadow-sm border border-border/20">
                {group.date}
              </span>
            </div>
            <AnimatePresence>
              {group.msgs.map((msg) => {
                const isMine = msg.sender_id === user.id;
                const time = new Date(msg.created_at).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });
                const replyMsg = msg.reply_to_id ? msgMap.get(msg.reply_to_id) : null;
                const replyTo = replyMsg
                  ? { content: replyMsg.content, senderName: replyMsg.sender_id === user.id ? "You" : partnerName }
                  : null;

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
                    userId={user.id}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      <ChatInput
        onSend={handleSend}
        onSendSpecial={handleSendSpecial}
        sending={sending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
};

export default Chat;
