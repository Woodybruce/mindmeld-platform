import { useState, useRef } from "react";
import { Send, X, Loader2, Mic, Square, Reply, Plus, Camera, Images, Paperclip, MapPin, BarChart3, CalendarPlus, Smile, Film } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import GalleryPicker from "./GalleryPicker";
import LocationComposer from "./LocationComposer";
import PollComposer from "./PollComposer";
import EventComposer from "./EventComposer";
import StickerPicker from "./StickerPicker";
import GifPicker from "./GifPicker";

interface ChatInputProps {
  onSend: (content: string, imageFile?: File | null, audioBlob?: Blob | null, galleryImageUrl?: string | null) => Promise<void>;
  onSendSpecial?: (type: string, data: any) => Promise<void>;
  sending: boolean;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

const ChatInput = ({ onSend, onSendSpecial, sending, replyingTo, onCancelReply }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryUrl, setGalleryUrl] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setGalleryUrl(null);
    setAttachOpen(false);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setGalleryUrl(null);
  };

  const handleGallerySelect = (url: string) => {
    setGalleryUrl(url);
    setImagePreview(url);
    setImageFile(null);
    setAttachOpen(false);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile && !galleryUrl) || sending) return;
    const content = input.trim();
    setInput("");
    const currentGalleryUrl = galleryUrl;
    clearImage();
    await onSend(content, imageFile, null, currentGalleryUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecording(false);
        setRecordingTime(0);
        clearInterval(timerRef.current);
        await onSend("🎤 Voice message", null, blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      // mic permission denied
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const attachActions = [
    { icon: Camera, label: "Camera", gradient: "from-[hsl(var(--us-coral))] to-[hsl(var(--us-terracotta))]", onClick: () => { setAttachOpen(false); setTimeout(() => cameraInputRef.current?.click(), 100); } },
    { icon: Images, label: "Gallery", gradient: "from-[hsl(var(--us-sage))] to-[hsl(145,30%,45%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setGalleryOpen(true), 100); } },
    { icon: Paperclip, label: "Photo", gradient: "from-[hsl(var(--us-navy))] to-[hsl(220,40%,35%)]", onClick: () => { setAttachOpen(false); setTimeout(() => fileInputRef.current?.click(), 100); } },
    { icon: MapPin, label: "Location", gradient: "from-[hsl(var(--us-coral))] to-[hsl(0,60%,45%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setLocationOpen(true), 100); } },
    { icon: BarChart3, label: "Poll", gradient: "from-[hsl(var(--us-gold))] to-[hsl(30,70%,45%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setPollOpen(true), 100); } },
    { icon: CalendarPlus, label: "Event", gradient: "from-[hsl(var(--us-blush))] to-[hsl(350,50%,55%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setEventOpen(true), 100); } },
    { icon: Smile, label: "Stickers", gradient: "from-[hsl(40,80%,55%)] to-[hsl(30,90%,50%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setStickerOpen(true), 100); } },
    { icon: Film, label: "GIF", gradient: "from-[hsl(270,60%,55%)] to-[hsl(290,50%,45%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setGifOpen(true), 100); } },
  ];

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-40">
      {/* Attachment backdrop */}
      <AnimatePresence>
        {attachOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
            onClick={() => setAttachOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Attachment menu */}
      <AnimatePresence>
        {attachOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.85 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl mx-4 mb-3 px-4 py-5 max-w-lg sm:mx-auto"
          >
            <div className="grid grid-cols-4 gap-y-5 gap-x-2 justify-items-center">
              {attachActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                  <div className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-lg`}>
                    <action.icon className="w-5.5 h-5.5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card/95 backdrop-blur-xl border-t border-border/30 px-4 py-2"
          >
            <div className="max-w-lg mx-auto relative inline-block">
              <div className="rounded-2xl overflow-hidden border border-border/30 bg-secondary shadow-lg">
                <img src={imagePreview} alt="Preview" className="max-h-32 object-cover" />
              </div>
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card/95 backdrop-blur-xl border-t border-border/30 px-4 py-2"
          >
            <div className="max-w-lg mx-auto flex items-center gap-2">
              <Reply className="w-4 h-4 text-[hsl(var(--us-coral))] flex-shrink-0" />
              <div className="flex-1 min-w-0 border-l-[3px] border-[hsl(var(--us-coral))] pl-2.5 py-0.5">
                <p className="text-[11px] font-semibold text-[hsl(var(--us-coral))]">{replyingTo.senderName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
              <button onClick={onCancelReply} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 px-2 py-1.5">
        <div className="flex items-end gap-1.5 max-w-lg mx-auto">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

          {recording ? (
            <>
              <div className="flex-1 h-12 flex items-center gap-3 px-4 rounded-full bg-destructive/10 border border-destructive/20">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-semibold text-destructive font-body">{formatTime(recordingTime)}</span>
                <span className="text-xs text-destructive/60">Recording…</span>
              </div>
              <button
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground shadow-lg flex-shrink-0 active:scale-95 transition-transform"
              >
                <Square className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center rounded-full bg-secondary border border-border/30 overflow-hidden min-h-[48px]">
                <button
                  onClick={() => setAttachOpen((v) => !v)}
                  className="pl-3 pr-1 py-3 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                >
                  <Plus className={`w-5 h-5 transition-transform duration-200 ${attachOpen ? "rotate-45 text-[hsl(var(--us-coral))]" : ""}`} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message"
                  className="flex-1 bg-transparent py-3 px-2 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none font-body"
                />
              </div>

              {input.trim() || imageFile || galleryUrl ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-12 h-12 rounded-full bg-[hsl(var(--us-navy))] flex items-center justify-center text-primary-foreground disabled:opacity-40 shadow-lg flex-shrink-0 active:scale-95 transition-transform"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-12 h-12 rounded-full bg-[hsl(var(--us-navy))] flex items-center justify-center text-primary-foreground shadow-lg flex-shrink-0 active:scale-95 transition-transform"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <GalleryPicker open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelect={handleGallerySelect} />
      <LocationComposer open={locationOpen} onClose={() => setLocationOpen(false)} onSend={(data) => onSendSpecial?.("location", data)} />
      <PollComposer open={pollOpen} onClose={() => setPollOpen(false)} onSend={(data) => onSendSpecial?.("poll", data)} />
      <EventComposer open={eventOpen} onClose={() => setEventOpen(false)} onSend={(data) => onSendSpecial?.("event", data)} />
      <StickerPicker open={stickerOpen} onClose={() => setStickerOpen(false)} onSelect={(sticker) => onSendSpecial?.("sticker", { emoji: sticker })} />
      <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onSelect={(url) => onSendSpecial?.("gif", { url })} />
    </div>
  );
};

export default ChatInput;
