import { useState, useRef, useCallback, useEffect } from "react";
import { Send, X, Loader2, Mic, Square, Reply, Plus, Camera, Paperclip, MapPin, BarChart3, CalendarPlus, Smile, Instagram, ExternalLink, Music } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { AnimatePresence, motion } from "framer-motion";
import LocationComposer from "./LocationComposer";
import PollComposer from "./PollComposer";
import EventComposer from "./EventComposer";
import StickerPicker from "./StickerPicker";
import SpotifySongPicker from "./SpotifySongPicker";

interface ChatInputProps {
  onSend: (content: string, imageFiles?: File[] | null, audioBlob?: Blob | null, galleryImageUrl?: string | null) => Promise<void>;
  onSendSpecial?: (type: string, data: any) => Promise<void>;
  onSaveInstagramLink?: (url: string) => void;
  sending: boolean;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

const ChatInput = ({ onSend, onSendSpecial, onSaveInstagramLink, sending, replyingTo, onCancelReply, onTyping, onStopTyping }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [galleryUrl, setGalleryUrl] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Stop the mic + timer if the component unmounts mid-recording (e.g. navigating away)
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try { mediaRecorderRef.current?.stop(); } catch { /* already stopped */ }
    };
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setImageFiles((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
    setGalleryUrl(null);
    setAttachOpen(false);
    // Reset the input so the same file(s) can be re-selected
    e.target.value = "";
  };

  const clearImage = () => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    setGalleryUrl(null);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && imageFiles.length === 0 && !galleryUrl) || sending) return;
    onStopTyping?.();
    const content = input.trim();
    setInput("");
    const currentGalleryUrl = galleryUrl;
    const currentFiles = [...imageFiles];
    clearImage();
    await onSend(content, currentFiles.length > 0 ? currentFiles : null, null, currentGalleryUrl);
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
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
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

  const openCamera = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const photo = await CapCamera.getPhoto({
          quality: 80,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          allowEditing: false,
        });
        if (photo.dataUrl) {
          // Convert data URL to File
          const res = await fetch(photo.dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
          setImageFiles((prev) => [...prev, file]);
          setImagePreviews((prev) => [...prev, photo.dataUrl!]);
          setGalleryUrl(null);
        }
      } catch (e: any) {
        console.warn("[Camera] Capacitor camera error:", e);
        // Fall back to file input
        cameraInputRef.current?.click();
      }
    } else {
      cameraInputRef.current?.click();
    }
  }, []);

  const attachActions = [
    { icon: Camera, label: "Camera", gradient: "from-[hsl(var(--us-coral))] to-[hsl(var(--us-terracotta))]", onClick: () => { openCamera(); setAttachOpen(false); } },
    { icon: Paperclip, label: "Media", gradient: "from-[hsl(var(--us-navy))] to-[hsl(220,40%,35%)]", onClick: () => { fileInputRef.current?.click(); setAttachOpen(false); } },
    { icon: MapPin, label: "Location", gradient: "from-[hsl(var(--us-coral))] to-[hsl(0,60%,45%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setLocationOpen(true), 100); } },
    { icon: BarChart3, label: "Poll", gradient: "from-[hsl(var(--us-gold))] to-[hsl(30,70%,45%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setPollOpen(true), 100); } },
    { icon: CalendarPlus, label: "Event", gradient: "from-[hsl(var(--us-blush))] to-[hsl(350,50%,55%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setEventOpen(true), 100); } },
    { icon: Smile, label: "Stickers", gradient: "from-[hsl(40,80%,55%)] to-[hsl(30,90%,50%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setStickerOpen(true), 100); } },
    { icon: Instagram, label: "Instagram", gradient: "from-[hsl(330,70%,55%)] to-[hsl(30,90%,55%)]", onClick: () => { setAttachOpen(false); setTimeout(() => setInstagramOpen(true), 100); } },
    { icon: Music, label: "Song", gradient: "from-[#1DB954] to-[#158a3e]", onClick: () => { setAttachOpen(false); setTimeout(() => setSpotifyOpen(true), 100); } },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto">
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
                  <span className="text-[13px] text-muted-foreground font-medium">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image previews */}
      <AnimatePresence>
        {imagePreviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card/95 backdrop-blur-xl border-t border-border/30 px-4 py-2"
          >
            <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto pb-1">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <div className="rounded-2xl overflow-hidden border border-border/30 bg-secondary shadow-lg">
                    <img src={preview} alt={`Preview ${idx + 1}`} className="h-24 w-24 object-cover" />
                  </div>
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">{imagePreviews.length} photo{imagePreviews.length > 1 ? "s" : ""} selected</p>
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
                <p className="text-[13px] font-semibold text-[hsl(var(--us-coral))]">{replyingTo.senderName}</p>
                <p className="text-[13px] text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
              <button onClick={onCancelReply} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 px-3 py-3 safe-area-bottom">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <input type="file" ref={fileInputRef} accept="image/*" multiple className="absolute w-0 h-0 overflow-hidden opacity-0" onChange={handleImageSelect} data-testid="chat-file-input" />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="absolute w-0 h-0 overflow-hidden opacity-0" onChange={handleImageSelect} data-testid="chat-camera-input" />

          {recording ? (
            <>
              <div className="flex-1 h-14 flex items-center gap-3 px-4 rounded-full bg-destructive/10 border border-destructive/20">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-base font-semibold text-destructive font-body">{formatTime(recordingTime)}</span>
                <span className="text-sm text-destructive/60">Recording…</span>
              </div>
              <button
                onClick={stopRecording}
                className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground shadow-lg flex-shrink-0 active:scale-95 transition-transform"
              >
                <Square className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center rounded-full bg-secondary/80 border border-border/40 overflow-hidden min-h-[44px]">
                <button
                  onClick={() => setAttachOpen((v) => !v)}
                  className="pl-3 pr-1 py-3 text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
                >
                  <Plus className={`w-5.5 h-5.5 transition-transform duration-200 ${attachOpen ? "rotate-45 text-[hsl(210,100%,52%)]" : ""}`} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); onTyping?.(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="iMessage"
                  className="flex-1 bg-transparent py-3 px-2 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none font-body"
                />
              </div>

              {input.trim() || imageFiles.length > 0 || galleryUrl ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-10 h-10 rounded-full bg-[hsl(210,100%,52%)] flex items-center justify-center text-white disabled:opacity-40 shadow-sm flex-shrink-0 active:scale-95 transition-transform"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={openCamera}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <Camera className="w-5.5 h-5.5" />
                  </button>
                  <button
                    onClick={startRecording}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <Mic className="w-5.5 h-5.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <LocationComposer open={locationOpen} onClose={() => setLocationOpen(false)} onSend={(data) => onSendSpecial?.("location", data)} />
      <PollComposer open={pollOpen} onClose={() => setPollOpen(false)} onSend={(data) => onSendSpecial?.("poll", data)} />
      <EventComposer open={eventOpen} onClose={() => setEventOpen(false)} onSend={(data) => onSendSpecial?.("event", data)} />
      <StickerPicker open={stickerOpen} onClose={() => setStickerOpen(false)} onSelect={(sticker) => onSendSpecial?.("sticker", { emoji: sticker })} />
      <SpotifySongPicker open={spotifyOpen} onClose={() => setSpotifyOpen(false)} onSend={(data) => onSendSpecial?.("spotify", data)} />

      {/* Instagram link composer */}
      <AnimatePresence>
        {instagramOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setInstagramOpen(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-3xl border border-border/50 p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-[hsl(330,70%,55%)]" /> Save Instagram Link
                </h3>
                <button onClick={() => setInstagramOpen(false)} className="p-1.5 rounded-full hover:bg-secondary">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Browse Instagram, copy a link, then paste it here to share</p>
              
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Instagram
              </a>

              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && instagramUrl.trim()) {
                    const url = instagramUrl.trim();
                    onSend(url);
                    onSaveInstagramLink?.(url);
                    setInstagramUrl("");
                    setInstagramOpen(false);
                  }
                }}
                placeholder="Paste link here…"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={() => {
                  if (!instagramUrl.trim()) return;
                  const url = instagramUrl.trim();
                  onSend(url);
                  onSaveInstagramLink?.(url);
                  setInstagramUrl("");
                  setInstagramOpen(false);
                }}
                disabled={!instagramUrl.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-[hsl(330,70%,55%)] to-[hsl(30,90%,55%)] py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Share & Save
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInput;
