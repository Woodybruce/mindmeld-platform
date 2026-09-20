import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import type { QuotedMessage } from "./MessageBubble";

interface ComposerProps {
  onSend: (text: string) => void;
  onAttachImage: (file: File, caption: string) => void;
  replyingTo: QuotedMessage | null;
  onCancelReply: () => void;
  sending: boolean;
}

const Composer = ({ onSend, onAttachImage, replyingTo, onCancelReply, sending }: ComposerProps) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const canSend = text.trim().length > 0 && !sending;

  const submit = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="border-t border-border bg-card safe-area-bottom">
      {replyingTo && (
        <div
          data-testid="reply-preview"
          className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground"
        >
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <span className="block font-semibold text-primary">{replyingTo.senderName}</span>
            <span className="block truncate">{replyingTo.snippet}</span>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={onCancelReply}
            className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-label="Attach image"
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center shrink-0 hover:bg-secondary/80 transition-colors"
        >
          <ImagePlus className="w-4.5 h-4.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose image"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onAttachImage(file, text.trim());
              setText("");
            }
            e.target.value = "";
          }}
        />
        <textarea
          ref={textareaRef}
          aria-label="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message"
          rows={1}
          className="flex-1 resize-none bg-secondary rounded-2xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-[120px]"
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={submit}
          disabled={!canSend}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Composer;
