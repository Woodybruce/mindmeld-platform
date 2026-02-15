import { useState, useRef } from "react";
import { Send, ImagePlus, X, Loader2, Mic, Square, Reply } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string, imageFile?: File | null, audioBlob?: Blob | null) => Promise<void>;
  sending: boolean;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

const ChatInput = ({ onSend, sending, replyingTo, onCancelReply }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imageFile) || sending) return;
    const content = input.trim();
    setInput("");
    clearImage();
    await onSend(content, imageFile);
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

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40">
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

      <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 p-2.5">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />

          {recording ? (
            <>
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full bg-destructive/10">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground flex-shrink-0"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
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
              {input.trim() || imageFile ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-10 h-10 rounded-full bg-[hsl(var(--us-navy))] flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-10 h-10 rounded-full bg-[hsl(var(--us-navy))] flex items-center justify-center text-primary-foreground flex-shrink-0"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
