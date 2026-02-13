import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, ImagePlus, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string | null;
  read: boolean;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [partnerName, setPartnerName] = useState("Partner");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partnerId = profile?.partner_id;

  // Fetch partner name
  useEffect(() => {
    if (!partnerId) return;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", partnerId)
      .single()
      .then(({ data }) => {
        if (data?.username) setPartnerName(data.username);
      });
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
    supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", partnerId)
      .eq("read", false)
      .then();

    // Realtime subscription
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
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
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || !user || !partnerId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setUploading(!!imageFile);

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      setImageFile(null);
      setImagePreview(null);
      setUploading(false);
    }

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: content || (imageUrl ? "📷 Photo" : ""),
      image_url: imageUrl,
    } as any);

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Sign in to chat</p>
      </div>
    );
  }

  if (!partnerId) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>
            <h1 className="font-body text-sm font-semibold text-foreground">Chat</h1>
          </div>
        </header>
        <main className="flex-1 px-4 py-12 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-lg font-display font-semibold text-foreground">Link your partner first</p>
            <p className="text-sm text-muted-foreground">Go to Profile and enter your partner's email to start chatting</p>
            <button onClick={() => navigate("/profile")} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
              Go to Profile
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const partnerInitial = partnerName.charAt(0).toUpperCase();

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-br from-us-blush to-us-coral text-primary-foreground text-xs font-display">
              {partnerInitial}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-body text-sm font-semibold text-foreground">{partnerName}</h1>
            <p className="text-[10px] text-muted-foreground">Your partner</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 overflow-y-auto pb-24 space-y-1">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center pt-20">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Say something lovely 💕</p>
            </div>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">{group.date}</span>
            </div>
            <AnimatePresence>
              {group.msgs.map((msg) => {
                const isMine = msg.sender_id === user.id;
                const time = new Date(msg.created_at).toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl overflow-hidden ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Shared photo"
                          className="w-full max-h-60 object-cover"
                          loading="lazy"
                        />
                      )}
                      {msg.content && msg.content !== "📷 Photo" && (
                        <p className="text-sm leading-relaxed break-words px-3.5 py-2">{msg.content}</p>
                      )}
                      {(!msg.content || msg.content === "📷 Photo") && msg.image_url && (
                        <div className="px-3.5 py-1" />
                      )}
                      <p className={`text-[9px] px-3.5 pb-1.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {time}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Image preview */}
      {imagePreview && (
        <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2">
          <div className="max-w-lg mx-auto relative">
            <div className="rounded-xl overflow-hidden border border-border bg-card shadow-lg inline-block">
              <img src={imagePreview} alt="Preview" className="max-h-32 object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border/50 p-3 z-40">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !imageFile) || sending}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-us-terracotta flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
