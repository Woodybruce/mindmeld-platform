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
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={`flex mb-[3px] group ${isMine ? "justify-end" : "justify-start"}`}
    >
      {/* Reply button - left side for partner messages */}
      {!isMine && onSwipeReply && (
        <button
          onClick={() => onSwipeReply(id)}
          className="self-center mr-1 opacity-0 group-hover:opacity-50 active:opacity-80 transition-opacity"
        >
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      <div
        className={`relative max-w-[80%] rounded-[18px] overflow-hidden shadow-sm ${
          isMine
            ? "bg-[hsl(var(--us-navy))] text-primary-foreground rounded-br-[4px]"
            : "bg-card text-foreground border border-border/40 rounded-bl-[4px]"
        }`}
      >
        {/* Quoted reply */}
        {replyTo && (
          <div
            className={`mx-2 mt-2 px-3 py-2 rounded-xl border-l-[3px] ${
              isMine
                ? "bg-white/10 border-l-white/40"
                : "bg-secondary/80 border-l-[hsl(var(--us-coral))]"
            }`}
          >
            <p className={`text-[11px] font-semibold mb-0.5 ${isMine ? "text-white/70" : "text-[hsl(var(--us-coral))]"}`}>
              {replyTo.senderName}
            </p>
            <p className={`text-[11px] line-clamp-2 ${isMine ? "text-white/45" : "text-muted-foreground"}`}>
              {replyTo.content}
            </p>
          </div>
        )}

        {imageUrl && (
          <img
            src={imageUrl}
            alt="Shared photo"
            className="w-full max-h-72 object-cover"
            loading="lazy"
          />
        )}

        {audioUrl && (
          <div className="px-3 py-2.5">
            <audio controls src={audioUrl} className="w-full h-8" style={{ maxWidth: 240 }} />
          </div>
        )}

        {content && content !== "📷 Photo" && (
          <p className="text-[14.5px] leading-[1.35] break-words px-3 pt-1.5 pb-0">
            {renderContentWithLinks(content)}
          </p>
        )}

        {isPhotoOnly && !content && <div className="px-3 py-0.5" />}

        {/* Time + ticks row */}
        <div className={`flex items-center justify-end gap-1 px-3 pb-[6px] pt-[2px]`}>
          <span className={`text-[10px] leading-none ${isMine ? "text-white/40" : "text-muted-foreground/70"}`}>
            {time}
          </span>
          {isMine && (
            read ? (
              <CheckCheck className="w-[15px] h-[15px] text-[hsl(var(--us-sage))]" />
            ) : (
              <Check className="w-[15px] h-[15px] text-white/35" />
            )
          )}
        </div>
      </div>

      {/* Reply button - right side for own messages */}
      {isMine && onSwipeReply && (
        <button
          onClick={() => onSwipeReply(id)}
          className="self-center ml-1 opacity-0 group-hover:opacity-50 active:opacity-80 transition-opacity"
        >
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

export default ChatBubble;
