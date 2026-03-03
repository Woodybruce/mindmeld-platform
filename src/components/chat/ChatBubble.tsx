import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Reply, MapPin, BarChart3, CalendarPlus, ExternalLink, ListPlus, CalendarCheck, Navigation, Clock, Trash2, ImageOff } from "lucide-react";
import { useSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";

const ChatImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center bg-secondary/60 text-muted-foreground gap-2">
        <ImageOff className="w-6 h-6 opacity-40" />
        <span className="text-xs opacity-60">Photo unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {!loaded && (
        <div className="w-full h-40 bg-secondary/60 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full max-h-72 object-cover ${loaded ? "" : "h-0 overflow-hidden"}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
};
import { toast } from "sonner";

const TAPBACK_REACTIONS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];

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
  onDelete?: (id: string) => void;
  onReact?: (msgId: string, emoji: string) => void;
  reaction?: string | null;
  userId?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
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
  messageType, replyTo, onSwipeReply, onPollVote, onSavePollToList, onSaveEventToCalendar, onDelete, onReact, reaction, userId,
  isFirstInGroup = true, isLastInGroup = true,
}: ChatBubbleProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const { playTrack } = useSpotifyPlayer();
  const isPhotoOnly = (!content || content === "📷 Photo") && imageUrl;
  const isSpecial = messageType === "location" || messageType === "poll" || messageType === "event";
  const isSticker = messageType === "sticker";
  const isGif = messageType === "gif";
  const looksLikeSpotify = !!(content && content.includes('"spotifyUrl"') && content.includes('"name"'));
  const isSpotify = messageType === "spotify" || looksLikeSpotify;
  const parsed = (isSpecial || isSticker || isGif || isSpotify) ? tryParseJSON(content) : null;

  // iMessage grouping: tight spacing within group, normal spacing between groups
  const spacingClass = isLastInGroup ? (reaction ? "mb-5" : "mb-2") : "mb-[2px]";
  // Only show time on last message in group
  const showTime = isLastInGroup;

  // iMessage bubble radius: tail only on the last message in a group
  const getBubbleRadius = () => {
    if (isMine) {
      if (isFirstInGroup && isLastInGroup) return "rounded-[20px] rounded-br-[6px]"; // single message
      if (isFirstInGroup) return "rounded-[20px] rounded-br-[12px]"; // first of group
      if (isLastInGroup) return "rounded-[20px] rounded-br-[6px]"; // last = tail
      return "rounded-[20px] rounded-br-[12px] rounded-tr-[12px]"; // middle
    } else {
      if (isFirstInGroup && isLastInGroup) return "rounded-[20px] rounded-bl-[6px]";
      if (isFirstInGroup) return "rounded-[20px] rounded-bl-[12px]";
      if (isLastInGroup) return "rounded-[20px] rounded-bl-[6px]";
      return "rounded-[20px] rounded-bl-[12px] rounded-tl-[12px]";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className={`flex ${spacingClass} group relative ${isMine ? "justify-end pl-12" : "justify-start pr-12"}`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isMine && onDelete) setShowDelete((v) => !v);
        else setShowReactions((v) => !v);
      }}
      onDoubleClick={() => {
        if (!isMine && onReact) onReact(id, "❤️");
      }}
      onClick={() => { showDelete && setShowDelete(false); showReactions && setShowReactions(false); }}
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
          {showTime && (
            <div className="flex items-center justify-end gap-1 px-1 pb-1 pt-0.5">
              <span className={`text-[14px] leading-none text-muted-foreground/70`}>{time}</span>
              {isMine && (
                read ? <CheckCheck className="w-[15px] h-[15px] text-[hsl(var(--us-sage))]" /> : <Check className="w-[15px] h-[15px] text-muted-foreground/40" />
              )}
            </div>
          )}
        </div>
      ) : isGif && parsed ? (
        <div className={`relative max-w-[75%] overflow-hidden shadow-sm ${getBubbleRadius()}`}>
          <img src={parsed.url} alt="GIF" className="w-full max-h-60 object-cover" loading="lazy" />
          {showTime && (
            <div className="flex items-center justify-end gap-1 px-3 pb-[6px] pt-[2px]">
              <span className={`text-[14px] leading-none ${isMine ? "text-white/60" : "text-muted-foreground/70"}`}>{time}</span>
              {isMine && (
                read ? <CheckCheck className="w-[14px] h-[14px] text-[hsl(var(--us-sage))]" /> : <Check className="w-[14px] h-[14px] text-white/40" />
              )}
            </div>
          )}
        </div>
      ) : (
      <div className={`relative max-w-[75%] overflow-hidden ${getBubbleRadius()} ${
        isMine
          ? "bg-[hsl(211,100%,50%)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
          : "bg-[hsl(var(--secondary))] text-foreground shadow-[0_1px_1px_rgba(0,0,0,0.06)]"
      }`}>
        {/* Quoted reply */}
        {replyTo && (
          <div className={`mx-2 mt-2 px-3 py-2 rounded-xl border-l-[3px] ${
            isMine ? "bg-white/15 border-l-white/50" : "bg-background/60 border-l-[hsl(210,100%,52%)]"
          }`}>
            <p className={`text-[13px] font-semibold mb-0.5 ${isMine ? "text-white/80" : "text-[hsl(210,100%,52%)]"}`}>{replyTo.senderName}</p>
            <p className={`text-[13px] line-clamp-2 ${isMine ? "text-white/50" : "text-muted-foreground"}`}>{replyTo.content}</p>
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

        {isSpotify && parsed && (
          <div className="p-2.5" data-testid="spotify-song-card">
            {parsed.id ? (
              <button onClick={() => playTrack(parsed.id)} className="block w-full text-left">
                <div className={`flex items-center gap-3 rounded-xl p-2.5 ${isMine ? "bg-white/10" : "bg-[#1DB954]/10"}`}>
                  {parsed.albumArt && <img src={parsed.albumArt} alt="" className="w-12 h-12 rounded-lg shadow-md flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-semibold truncate ${isMine ? "text-white" : "text-foreground"}`}>{parsed.name}</p>
                    <p className={`text-[13px] truncate ${isMine ? "text-white/60" : "text-muted-foreground"}`}>{parsed.artist}</p>
                    <p className={`text-[14px] mt-0.5 flex items-center gap-1 ${isMine ? "text-white/40" : "text-[#1DB954]"}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Play
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-white shrink-0">
                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </button>
            ) : (
              <a href={parsed.spotifyUrl} target="_blank" rel="noopener noreferrer" className="block">
                <div className={`flex items-center gap-3 rounded-xl p-2.5 ${isMine ? "bg-white/10" : "bg-[#1DB954]/10"}`}>
                  {parsed.albumArt && <img src={parsed.albumArt} alt="" className="w-12 h-12 rounded-lg shadow-md flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-semibold truncate ${isMine ? "text-white" : "text-foreground"}`}>{parsed.name}</p>
                    <p className={`text-[13px] truncate ${isMine ? "text-white/60" : "text-muted-foreground"}`}>{parsed.artist}</p>
                    <p className={`text-[14px] mt-0.5 flex items-center gap-1 ${isMine ? "text-white/40" : "text-[#1DB954]"}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Open on Spotify
                    </p>
                  </div>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Event card */}
        {messageType === "event" && parsed && (
          <div className="p-3">
            <div className={`flex items-center gap-2 mb-2 ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
              <CalendarPlus className="w-4 h-4 text-[hsl(var(--us-blush))]" />
              <span className="text-[13px] font-semibold uppercase tracking-wide">Event</span>
            </div>
            <div className={`rounded-xl p-3 ${isMine ? "bg-white/10" : "bg-secondary/60"}`}>
              <p className={`text-[14px] font-semibold ${isMine ? "text-white" : "text-foreground"}`}>{parsed.title}</p>
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <p className={`text-[13px] font-medium ${isMine ? "text-white/50" : "text-muted-foreground"}`}>Date</p>
                  <p className={`text-[13px] font-semibold ${isMine ? "text-white/90" : "text-foreground"}`}>
                    {new Date(parsed.date + "T00:00").toLocaleDateString("default", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
                {parsed.time && (
                  <div>
                    <p className={`text-[13px] font-medium ${isMine ? "text-white/50" : "text-muted-foreground"}`}>Time</p>
                    <p className={`text-[13px] font-semibold ${isMine ? "text-white/90" : "text-foreground"}`}>{parsed.time}</p>
                  </div>
                )}
              </div>
              {parsed.location && (
                <div className="flex items-center gap-1.5 mt-2">
                  <MapPin className={`w-3 h-3 ${isMine ? "text-white/40" : "text-muted-foreground"}`} />
                  <p className={`text-[14px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}>{parsed.location}</p>
                </div>
              )}
            </div>
            {onSaveEventToCalendar && (
              <button
                onClick={async () => {
                  try {
                    await onSaveEventToCalendar({ title: parsed.title, date: parsed.date, time: parsed.time, location: parsed.location });
                    toast.success("Event saved to calendar");
                  } catch {
                    toast.error("Failed to save event");
                  }
                }}
                className={`flex items-center gap-1.5 mt-2 text-[14px] font-medium ${isMine ? "text-white/60 hover:text-white/80" : "text-primary hover:text-primary/80"} transition-colors`}
              >
                <CalendarCheck className="w-3.5 h-3.5" /> Save to Calendar
              </button>
            )}
          </div>
        )}

        {imageUrl && (
          <ChatImage src={imageUrl} alt="Shared photo" />
        )}

        {audioUrl && (
          <div className="px-3 py-2.5">
            <audio controls src={audioUrl} className="w-full h-8" style={{ maxWidth: 240 }} />
          </div>
        )}

        {content && content !== "📷 Photo" && !isSpecial && !isSticker && !isGif && !isSpotify && (
          <p className="text-[15px] leading-[1.3] break-words px-3 pt-2 pb-0.5">
            {renderContentWithLinks(content)}
          </p>
        )}

        {isPhotoOnly && !content && <div className="px-3 py-0.5" />}

        {showTime && (
          <div className="flex items-center justify-end gap-1 px-3 pb-[5px] pt-[1px]">
            <span className={`text-[14px] leading-none ${isMine ? "text-white/50" : "text-muted-foreground/60"}`}>{time}</span>
            {isMine && (
              read
                ? <CheckCheck className="w-[14px] h-[14px] text-white/70" />
                : <Check className="w-[14px] h-[14px] text-white/40" />
            )}
          </div>
        )}
        {!showTime && <div className="h-[2px]" />}
      </div>
      )}

      {isMine && onSwipeReply && (
        <button onClick={() => onSwipeReply(id)} className="self-center ml-1 opacity-0 group-hover:opacity-50 active:opacity-80 transition-opacity">
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Reaction badge */}
      {reaction && (
        <div className={`absolute -bottom-3 ${isMine ? "right-3" : "left-3"} z-10`}>
          <span className="text-base bg-card border border-border/50 rounded-full px-1.5 py-0.5 shadow-sm">
            {reaction}
          </span>
        </div>
      )}

      {/* Tapback reactions picker */}
      {showReactions && !isMine && onReact && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute -top-10 left-0 z-20 flex items-center gap-0.5 bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-2 py-1 shadow-xl"
        >
          {TAPBACK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onReact(id, emoji);
                setShowReactions(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary active:scale-110 transition-all text-lg"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      {/* Delete confirmation */}
      {showDelete && isMine && onDelete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-0 right-0 z-20 -mt-8"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
              setShowDelete(false);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-semibold shadow-lg"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </motion.div>
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
        <span className="text-[13px] font-semibold uppercase tracking-wide">Poll</span>
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
                  <span className={`text-[14px] font-semibold ${isMine ? "text-white/60" : "text-muted-foreground"}`}>{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className={`text-[14px] ${isMine ? "text-white/30" : "text-muted-foreground/50"}`}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </p>
        {onSaveToList && (
          <button
            onClick={() => {
              onSaveToList(parsed.question, parsed.options as string[]);
              toast.success("Poll saved to lists");
            }}
            className={`flex items-center gap-1 text-[13px] font-medium ${isMine ? "text-white/50 hover:text-white/70" : "text-primary/70 hover:text-primary"} transition-colors`}
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
            <span className="text-[13px] font-semibold uppercase tracking-wide">Live Location</span>
            {!isExpired && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--us-sage))] animate-pulse" />}
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4 text-[hsl(var(--us-coral))]" />
            <span className="text-[13px] font-semibold uppercase tracking-wide">Location</span>
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
            <span className={`text-[14px] font-medium ${isMine ? "text-white/40" : "text-muted-foreground/60"}`}>
              {parsed.lat.toFixed(4)}, {parsed.lng.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-secondary/30">
          <p className={`text-[13px] font-semibold ${isMine ? "text-white" : "text-foreground"}`}>{parsed.name}</p>
          {isLive && (
            <p className={`text-[13px] mt-0.5 flex items-center gap-1 ${isExpired ? (isMine ? "text-white/30" : "text-muted-foreground/50") : (isMine ? "text-white/60" : "text-muted-foreground")}`}>
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
        className={`flex items-center gap-1.5 mt-2 text-[14px] font-medium ${isMine ? "text-white/60 hover:text-white/80" : "text-primary hover:text-primary/80"}`}
      >
        <ExternalLink className="w-3 h-3" /> Open in Maps
      </a>
    </div>
  );
};

export default ChatBubble;
