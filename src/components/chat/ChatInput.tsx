import { useState, useRef } from "react";
import { Send, X, Loader2, Mic, Square, Reply, Plus, Camera, Images, Paperclip } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import GalleryPicker from "./GalleryPicker";

interface ChatInputProps {
  onSend: (content: string, imageFile?: File | null, audioBlob?: Blob | null, galleryImageUrl?: string | null) => Promise<void>;
  sending: boolean;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

const ChatInput = ({ onSend, sending, replyingTo, onCancelReply }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryUrl, setGalleryUrl] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
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
    { icon: Camera, label: "Camera", color: "bg-[hsl(var(--us-rose))]", onClick: () => cameraInputRef.current?.click() },
    { icon: Images, label: "Our Photos", color: "bg-[hsl(var(--us-sage))]", onClick: () => { setAttachOpen(false); setGalleryOpen(true); } },
    { icon: Paperclip, label: "File", color: "bg-[hsl(var(--us-navy))]", onClick: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40">
      {/* Attachment menu backdrop */}
      <AnimatePresence>
        {attachOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30"
            onClick={() => setAttachOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Attachment menu */}
      <AnimatePresence>
        {attachOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card border border-border/50 rounded-2xl shadow-xl mx-3 mb-2 p-4 max-w-lg sm:mx-auto"
          >
            <div className="flex justify-center gap-8">
              {attachActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center text-white shadow-md`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview */}
      {imagePreview && (
        <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 py-2">
          <div className="max-w-lg mx-auto relative inline-block">
            <div className="rounded-xl overflow-hidden border border-border bg-card shadow-lg">
              <img src={imagePreview} alt="Preview" className="max-h-28 object-cover" />
            </div>
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <Reply className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
              <p className="text-[11px] font-semibold text-primary">{replyingTo.senderName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{replyingTo.content}</p>
            </div>
            <button onClick={onCancelReply} className="p-1">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 px-2 py-1.5">
        <div className="flex items-end gap-1.5 max-w-lg mx-auto">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

          {recording ? (
            <>
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full bg-destructive/10">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="w-11 h-11 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground flex-shrink-0"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-0 rounded-full bg-secondary overflow-hidden">
                {/* Plus / attach button */}
                <button
                  onClick={() => setAttachOpen((v) => !v)}
                  className="p-2.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <Plus className={`w-5 h-5 transition-transform ${attachOpen ? "rotate-45" : ""}`} />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message"
                  className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>

              {input.trim() || imageFile || galleryUrl ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-11 h-11 rounded-full bg-[hsl(var(--us-navy))] flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-11 h-11 rounded-full bg-[hsl(var(--us-navy))] flex items-center justify-center text-primary-foreground flex-shrink-0"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <GalleryPicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleGallerySelect}
      />
    </div>
  );
};

export default ChatInput;
