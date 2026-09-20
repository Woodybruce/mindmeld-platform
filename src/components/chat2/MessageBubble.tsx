import { useRef, useState } from "react";
import { Reply } from "lucide-react";
import ReadTicks from "./ReadTicks";
import type { ChatMessage } from "@/lib/chat";

export interface QuotedMessage {
  id: string;
  senderName: string;
  snippet: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  senderName: string | null;
  senderColorClass: string;
  isFirstInRun: boolean;
  isLastInRun: boolean;
  read: boolean;
  quoted: QuotedMessage | null;
  onReply: (message: ChatMessage) => void;
  onQuoteTap: (messageId: string) => void;
}

const SWIPE_THRESHOLD_PX = 60;

const MessageBubble = ({
  message,
  isMine,
  senderName,
  senderColorClass,
  isFirstInRun,
  isLastInRun,
  read,
  quoted,
  onReply,
  onQuoteTap,
}: MessageBubbleProps) => {
  const isButler = message.senderUserId === null;
  const touchStartX = useRef<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx > 0) setSwipeX(Math.min(dx, 80));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && e.changedTouches[0].clientX - touchStartX.current > SWIPE_THRESHOLD_PX) {
      onReply(message);
    }
    touchStartX.current = null;
    setSwipeX(0);
  };

  const time = new Date(message.createdAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const bubbleColor = isMine
    ? "bg-accent text-accent-foreground"
    : isButler
      ? "bg-violet-100 text-foreground dark:bg-violet-900/40 dark:text-violet-50"
      : "bg-secondary text-foreground";

  const corner = isMine
    ? isLastInRun ? "rounded-br-md" : ""
    : isLastInRun ? "rounded-bl-md" : "";

  return (
    <div
      id={`msg-${message.id}`}
      className={`group flex w-full ${isMine ? "justify-end" : "justify-start"} ${isFirstInRun ? "mt-2.5" : "mt-0.5"}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {isButler && (
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm shrink-0 mr-1.5 ${isLastInRun ? "" : "invisible"}`}>
          ✨
        </div>
      )}
      <div
        className={`relative max-w-[78%] rounded-2xl px-3 py-2 shadow-sm transition-transform ${bubbleColor} ${corner}`}
        style={swipeX ? { transform: `translateX(${swipeX}px)` } : undefined}
      >
        {!isMine && isFirstInRun && senderName && (
          <p
            data-testid="sender-name"
            className={`text-xs font-semibold mb-0.5 ${isButler ? "text-violet-600 dark:text-violet-300" : senderColorClass}`}
          >
            {senderName}
          </p>
        )}

        {quoted && (
          <button
            type="button"
            onClick={() => onQuoteTap(quoted.id)}
            className={`block w-full text-left rounded-lg border-l-2 pl-2 pr-1.5 py-1 mb-1 text-xs ${
              isMine ? "border-primary-foreground/60 bg-black/10" : "border-primary bg-background/60"
            }`}
          >
            <span className={`block font-semibold ${isMine ? "" : "text-primary"}`}>{quoted.senderName}</span>
            <span className="block truncate opacity-80">{quoted.snippet}</span>
          </button>
        )}

        {message.messageType === "image" && message.imageUrl && (
          <img
            src={message.imageUrl}
            alt={message.body || "Shared photo"}
            className="rounded-xl max-w-full max-h-72 object-cover mb-1"
            loading="lazy"
          />
        )}
        {message.body && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        )}

        {isLastInRun && (
          <span
            data-testid="message-time"
            className={`flex items-center justify-end gap-1 mt-0.5 text-[11px] leading-none ${
              isMine ? "text-primary-foreground/60" : "text-muted-foreground"
            }`}
          >
            {time}
            {isMine && <ReadTicks read={read} />}
          </span>
        )}

        <button
          type="button"
          aria-label="Reply to message"
          onClick={() => onReply(message)}
          className={`absolute top-1/2 -translate-y-1/2 ${isMine ? "-left-9" : "-right-9"} w-7 h-7 rounded-full bg-secondary text-muted-foreground items-center justify-center hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <Reply className="w-3.5 h-3.5 mx-auto" />
        </button>
      </div>
    </div>
  );
};

export default MessageBubble;
