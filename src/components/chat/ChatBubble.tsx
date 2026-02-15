import { motion } from "framer-motion";
import { Check, CheckCheck, Reply } from "lucide-react";

interface ChatBubbleProps {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl?: string | null;
  isMine: boolean;
  time: string;
  read: boolean;
  replyTo?: { content: string; senderName: string } | null;
  onSwipeReply?: (id: string) => void;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const renderContentWithLinks = (text: string) => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const ChatBubble = ({
  id,
  content,
  imageUrl,
  audioUrl,
  isMine,
  time,
  read,
  replyTo,
  onSwipeReply,
}: ChatBubbleProps) => {
  const isPhotoOnly = (!content || content === "📷 Photo") && imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex mb-1 group ${isMine ? "justify-end" : "justify-start"}`}
    >
      {/* Reply swipe hint */}
      {!isMine && onSwipeReply && (
        <button
          onClick={() => onSwipeReply(id)}
          className="self-center mr-1 opacity-0 group-hover:opacity-60 transition-opacity"
        >
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      <div
        className={`max-w-[78%] rounded-xl overflow-hidden shadow-sm ${
          isMine
            ? "bg-[hsl(var(--us-navy))] text-primary-foreground rounded-br-sm"
            : "bg-card text-foreground border border-border/50 rounded-bl-sm"
        }`}
      >
        {/* Quoted message */}
        {replyTo && (
          <div
            className={`mx-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] ${
              isMine
                ? "bg-primary-foreground/10 border-l-primary-foreground/40"
                : "bg-secondary border-l-primary"
            }`}
          >
            <p className={`text-[10px] font-semibold ${isMine ? "text-primary-foreground/70" : "text-primary"}`}>
              {replyTo.senderName}
            </p>
            <p className={`text-[11px] line-clamp-2 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
              {replyTo.content}
            </p>
          </div>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Shared photo"
            className="w-full max-h-64 object-cover"
            loading="lazy"
          />
        )}

        {audioUrl && (
          <div className="px-3 py-2">
            <audio controls src={audioUrl} className="w-full h-8" style={{ maxWidth: 220 }} />
          </div>
        )}

        {content && content !== "📷 Photo" && (
          <p className="text-[14px] leading-relaxed break-words px-3 py-1.5">
            {renderContentWithLinks(content)}
          </p>
        )}

        {isPhotoOnly && !content && <div className="px-3 py-0.5" />}

        <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 ${!content && imageUrl ? "pt-0" : ""}`}>
          <span className={`text-[10px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
            {time}
          </span>
          {isMine && (
            read ? (
              <CheckCheck className="w-3.5 h-3.5 text-[hsl(var(--us-sage))]" />
            ) : (
              <Check className="w-3.5 h-3.5 text-primary-foreground/40" />
            )
          )}
        </div>
      </div>

      {isMine && onSwipeReply && (
        <button
          onClick={() => onSwipeReply(id)}
          className="self-center ml-1 opacity-0 group-hover:opacity-60 transition-opacity"
        >
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

export default ChatBubble;
