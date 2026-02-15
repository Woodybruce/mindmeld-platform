import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Reply, MapPin, BarChart3, CalendarPlus, ExternalLink, ListPlus, CalendarCheck, Navigation, Clock } from "lucide-react";
import { toast } from "sonner";

interface ChatBubbleProps {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl?: string | null;
  isMine: boolean;
  time: string;
  read: boolean;
  messageType?: string;
  replyTo?: { content: string; senderName: string } | null;
  onSwipeReply?: (id: string) => void;
  onPollVote?: (msgId: string, optionIdx: number) => void;
  onSavePollToList?: (question: string, options: string[]) => void;
  onSaveEventToCalendar?: (event: { title: string; date: string; time?: string; location?: string }) => void;
  userId?: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const renderContentWithLinks = (text: string) => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const tryParseJSON = (str: string) => {
  try { return JSON.parse(str); } catch { return null; }
};

const ChatBubble = ({
  id, content, imageUrl, audioUrl, isMine, time, read,
  messageType, replyTo, onSwipeReply, onPollVote, onSavePollToList, onSaveEventToCalendar, userId,
}: ChatBubbleProps) => {
  const isPhotoOnly = (!content || content === "📷 Photo") && imageUrl;
  const isSpecial = messageType === "location" || messageType === "poll" || messageType === "event";
  const isSticker = messageType === "sticker";
  const isGif = messageType === "gif";
  const parsed = (isSpecial || isSticker || isGif) ? tryParseJSON(content) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={`flex mb-[3px] group ${isMine ? "justify-end" : "justify-start"}`}
    >
      {!isMine && onSwipeReply && (
        <button onClick={() => onSwipeReply(id)} className="self-center mr-1 opacity-0 group-hover:opacity-50 active:opacity-80 transition-opacity">
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Sticker - rendered without bubble background */}
      {isSticker && parsed ? (
        <div className="px-1 py-1">
          <span className="text-7xl leading-none">{parsed.emoji}</span>
          <div className="flex items-center justify-end gap-1 px-1 pb-1 pt-0.5">
            <span className={`text-[10px] leading-none text-muted-foreground/70`}>{time}</span>
            {isMine && (
              read ? <CheckCheck className="w-[15px] h-[15px] text-[hsl(var(--us-sage))]" /> : <Check className="w-[15px] h-[15px] text-muted-foreground/40" />
            )}
          </div>
        </div>
      ) : isGif && parsed ? (
        <div className={`relative max-w-[80%] rounded-[18px] overflow-hidden shadow-sm ${
          isMine
            ? "bg-[hsl(var(--us-navy))] rounded-br-[4px]"
            : "bg-card border border-border/40 rounded-bl-[4px]"
        }`}>
          <img src={parsed.url} alt="GIF" className="w-full max-h-60 object-cover" loading="lazy" />
          <div className="flex items-center justify-end gap-1 px-3 pb-[6px] pt-[2px]">
            <span className={`text-[10px] leading-none ${isMine ? "text-white/40" : "text-muted-foreground/70"}`}>{time}</span>
            {isMine && (
              read ? <CheckCheck className="w-[15px] h-[15px] text-[hsl(var(--us-sage))]" /> : <Check className="w-[15px] h-[15px] text-white/35" />
            )}
          </div>
        </div>
      ) : (
      <div className={`relative max-w-[80%] rounded-[18px] overflow-hidden shadow-sm ${
        isMine
          ? "bg-[hsl(var(--us-navy))] text-primary-foreground rounded-br-[4px]"
          : "bg-card text-foreground border border-border/40 rounded-bl-[4px]"
      }`}>
        {/* Quoted reply */}
        {replyTo && (
          <div className={`mx-2 mt-2 px-3 py-2 rounded-xl border-l-[3px] ${
            isMine ? "bg-white/10 border-l-white/40" : "bg-secondary/80 border-l-[hsl(var(--us-coral))]"
          }`}>
            <p className={`text-[11px] font-semibold mb-0.5 ${isMine ? "text-white/70" : "text-[hsl(var(--us-coral))]"}`}>{replyTo.senderName}</p>
            <p className={`text-[11px] line-clamp-2 ${isMine ? "text-white/45" : "text-muted-foreground"}`}>{replyTo.content}</p>
          </div>
        )}

        {/* Location card */}
        {messageType === "location" && parsed && (
          <LocationCard parsed={parsed} isMine={isMine} />
        )}

        {/* Poll card */}
        {messageType === "poll" && parsed && (
          <PollCard parsed={parsed} isMine={isMine} msgId={id} onPollVote={onPollVote} userId={userId} onSaveToList={onSavePollToList} />
        )}

        {/* Event card */}
        {messageType === "event" && parsed && (
          <div className="p-3">
            <div className={`flex items-center gap-2 mb-2 ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
              <CalendarPlus className="w-4 h-4 text-[hsl(var(--us-blush))]" />
              <span className="text-[11px] font-semibold uppercase tracking-wide">Event</span>
            </div>
            <div className={`rounded-xl p-3 ${isMine ? "bg-white/10" : "bg-secondary/60"}`}>
              <p className={`text-[14px] font-semibold ${isMine ? "text-white" : "text-foreground"}`}>{parsed.title}</p>
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <p className={`text-[11px] font-medium ${isMine ? "text-white/50" : "text-muted-foreground"}`}>Date</p>
                  <p className={`text-[13px] font-semibold ${isMine ? "text-white/90" : "text-foreground"}`}>
                    {new Date(parsed.date + "T00:00").toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
                {parsed.time && (
                  <div>
                    <p className={`text-[11px] font-medium ${isMine ? "text-white/50" : "text-muted-foreground"}`}>Time</p>
                    <p className={`text-[13px] font-semibold ${isMine ? "text-white/90" : "text-foreground"}`}>{parsed.time}</p>
                  </div>
                )}
              </div>
              {parsed.location && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className={`w-3 h-3 ${isMine ? "text-white/40" : "text-muted-foreground"}`} />
                  <p className={`text-[12px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}>{parsed.location}</p>
                </div>
              )}
            </div>
            {onSaveEventToCalendar && (
              <button
                onClick={() => {
                  onSaveEventToCalendar({ title: parsed.title, date: parsed.date, time: parsed.time, location: parsed.location });
                  toast.success("Event saved to calendar");
                }}
                className={`flex items-center gap-1.5 mt-2 text-[12px] font-medium ${isMine ? "text-white/60 hover:text-white/80" : "text-primary hover:text-primary/80"} transition-colors`}
              >
                <CalendarCheck className="w-3.5 h-3.5" /> Save to Calendar
              </button>
            )}
          </div>
        )}

        {imageUrl && (
          <img src={imageUrl} alt="Shared photo" className="w-full max-h-72 object-cover" loading="lazy" />
        )}

        {audioUrl && (
          <div className="px-3 py-2.5">
            <audio controls src={audioUrl} className="w-full h-8" style={{ maxWidth: 240 }} />
          </div>
        )}

        {content && content !== "📷 Photo" && !isSpecial && !isSticker && !isGif && (
          <p className="text-[14.5px] leading-[1.35] break-words px-3 pt-1.5 pb-0">
            {renderContentWithLinks(content)}
          </p>
        )}

        {isPhotoOnly && !content && <div className="px-3 py-0.5" />}

        <div className="flex items-center justify-end gap-1 px-3 pb-[6px] pt-[2px]">
          <span className={`text-[10px] leading-none ${isMine ? "text-white/40" : "text-muted-foreground/70"}`}>{time}</span>
          {isMine && (
            read ? <CheckCheck className="w-[15px] h-[15px] text-[hsl(var(--us-sage))]" /> : <Check className="w-[15px] h-[15px] text-white/35" />
          )}
        </div>
      </div>
      )}

      {isMine && onSwipeReply && (
        <button onClick={() => onSwipeReply(id)} className="self-center ml-1 opacity-0 group-hover:opacity-50 active:opacity-80 transition-opacity">
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

// Poll sub-component
const PollCard = ({ parsed, isMine, msgId, onPollVote, userId, onSaveToList }: { parsed: any; isMine: boolean; msgId: string; onPollVote?: (msgId: string, idx: number) => void; userId?: string; onSaveToList?: (question: string, options: string[]) => void }) => {
  const votes: Record<number, string[]> = parsed.votes || {};
  const totalVotes = Object.values(votes).flat().length;
  const myVote = userId ? Object.entries(votes).find(([, voters]) => (voters as string[]).includes(userId))?.[0] : undefined;
  const hasVoted = myVote !== undefined;

  return (
    <div className="p-3">
      <div className={`flex items-center gap-2 mb-2 ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
        <BarChart3 className="w-4 h-4 text-[hsl(var(--us-gold))]" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">Poll</span>
      </div>
      <p className={`text-[14px] font-semibold mb-3 ${isMine ? "text-white" : "text-foreground"}`}>{parsed.question}</p>
      <div className="space-y-2">
        {(parsed.options as string[]).map((option, idx) => {
          const optionVotes = (votes[idx] || []).length;
          const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isMyVote = myVote === String(idx);

          return (
            <button
              key={idx}
              onClick={() => !hasVoted && onPollVote?.(msgId, idx)}
              disabled={hasVoted}
              className={`w-full text-left rounded-xl p-2.5 relative overflow-hidden transition-all ${
                hasVoted
                  ? isMine ? "bg-white/5" : "bg-secondary/40"
                  : isMine ? "bg-white/10 hover:bg-white/15 active:scale-[0.98]" : "bg-secondary/60 hover:bg-secondary active:scale-[0.98]"
              } ${isMyVote ? (isMine ? "ring-1 ring-white/30" : "ring-1 ring-primary/30") : ""}`}
            >
              {hasVoted && (
                <div
                  className={`absolute inset-0 rounded-xl ${isMine ? "bg-white/10" : "bg-primary/10"}`}
                  style={{ width: `${pct}%`, transition: "width 0.5s ease" }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={`text-[13px] font-medium ${isMine ? "text-white/90" : "text-foreground"}`}>{option}</span>
                {hasVoted && (
                  <span className={`text-[12px] font-semibold ${isMine ? "text-white/60" : "text-muted-foreground"}`}>{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className={`text-[10px] ${isMine ? "text-white/30" : "text-muted-foreground/50"}`}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </p>
        {onSaveToList && (
          <button
            onClick={() => {
              onSaveToList(parsed.question, parsed.options as string[]);
              toast.success("Poll saved to lists");
            }}
            className={`flex items-center gap-1 text-[11px] font-medium ${isMine ? "text-white/50 hover:text-white/70" : "text-primary/70 hover:text-primary"} transition-colors`}
          >
            <ListPlus className="w-3.5 h-3.5" /> Save to List
          </button>
        )}
      </div>
    </div>
  );
};

// Location sub-component
const LocationCard = ({ parsed, isMine }: { parsed: any; isMine: boolean }) => {
  const isLive = parsed.live === true;
  const expiresAt = isLive && parsed.duration ? new Date(new Date(parsed.sentAt || Date.now()).getTime() + parsed.duration * 60000) : null;
  const isExpired = expiresAt ? new Date() > expiresAt : false;
  const durationLabel = parsed.duration === 15 ? "15 min" : parsed.duration === 60 ? "1 hour" : parsed.duration === 480 ? "8 hours" : `${parsed.duration} min`;

  return (
    <div className="p-3">
      <div className={`flex items-center gap-2 mb-2 ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
        {isLive ? (
          <>
            <Navigation className={`w-4 h-4 ${isExpired ? "text-muted-foreground" : "text-[hsl(var(--us-sage))]"}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Live Location</span>
            {!isExpired && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--us-sage))] animate-pulse" />}
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4 text-[hsl(var(--us-coral))]" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Location</span>
          </>
        )}
      </div>

      <div className={`rounded-xl overflow-hidden border ${isMine ? "border-white/10" : "border-border/30"}`}>
        {/* Map placeholder with pin */}
        <div className="w-full h-28 bg-secondary/80 flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, hsl(var(--border)) 19px, hsl(var(--border)) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, hsl(var(--border)) 19px, hsl(var(--border)) 20px)'
          }} />
          <div className="flex flex-col items-center gap-1 relative z-10">
            <MapPin className={`w-8 h-8 ${isLive && !isExpired ? "text-[hsl(var(--us-sage))]" : "text-[hsl(var(--us-coral))]"} drop-shadow-md`} />
            <span className={`text-[10px] font-medium ${isMine ? "text-white/40" : "text-muted-foreground/60"}`}>
              {parsed.lat.toFixed(4)}, {parsed.lng.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-secondary/30">
          <p className={`text-[13px] font-semibold ${isMine ? "text-white" : "text-foreground"}`}>{parsed.name}</p>
          {isLive && (
            <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${isExpired ? (isMine ? "text-white/30" : "text-muted-foreground/50") : (isMine ? "text-white/60" : "text-muted-foreground")}`}>
              <Clock className="w-3 h-3" />
              {isExpired ? `Expired · ${durationLabel}` : `Sharing for ${durationLabel}`}
            </p>
          )}
        </div>
      </div>

      <a
        href={`https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-1.5 mt-2 text-[12px] font-medium ${isMine ? "text-white/60 hover:text-white/80" : "text-primary hover:text-primary/80"}`}
      >
        <ExternalLink className="w-3 h-3" /> Open in Maps
      </a>
    </div>
  );
};

export default ChatBubble;
