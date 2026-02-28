import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Music, Bell, ListChecks, Camera, MessageCircle, Calendar, FileText } from "lucide-react";
import { apiInvoke } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface NowPlayingData {
  isPlaying?: boolean;
  track?: {
    name: string;
    artist: string;
    album: string;
    albumArt: string;
    spotifyUrl: string;
  };
}

interface RecentTrack {
  name: string;
  artist: string;
  albumArt: string;
  spotifyUrl: string;
}

interface ActivityItem {
  id: string;
  type: "list" | "photo" | "message" | "file" | "task";
  label: string;
  detail: string;
  time: Date;
  route: string;
  icon: React.ReactNode;
  color: string;
}

const activityIconMap = {
  list: <ListChecks className="w-3.5 h-3.5" />,
  photo: <Camera className="w-3.5 h-3.5" />,
  message: <MessageCircle className="w-3.5 h-3.5" />,
  file: <FileText className="w-3.5 h-3.5" />,
  task: <Calendar className="w-3.5 h-3.5" />,
};

const activityColorMap: Record<string, string> = {
  list: "bg-blue-500/15 text-blue-600",
  photo: "bg-pink-500/15 text-pink-600",
  message: "bg-[hsl(var(--us-navy))]/15 text-[hsl(var(--us-navy))]",
  file: "bg-[hsl(var(--us-sage))]/15 text-[hsl(var(--us-sage))]",
  task: "bg-[hsl(var(--us-gold))]/15 text-[hsl(var(--us-gold))]",
};

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const SpotifyBoard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const partnerId = profile?.partner_id;
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(interval);
  }, [user, partnerId]);

  async function fetchAllData() {
    await Promise.all([fetchNowPlaying(), fetchRecent(), fetchActivity()]);
    setLoading(false);
  }

  async function fetchNowPlaying() {
    try {
      const { data } = await apiInvoke("spotify/now-playing", { method: "GET" });
      setNowPlaying(data as NowPlayingData);
    } catch {
      setNowPlaying(null);
    }
  }

  async function fetchRecent() {
    try {
      const { data } = await apiInvoke("spotify/recently-played", { method: "GET" });
      const resp = data as any;
      setRecentTracks((resp?.tracks || []).slice(0, 3));
    } catch {
      setRecentTracks([]);
    }
  }

  async function fetchActivity() {
    if (!user) return;
    const items: ActivityItem[] = [];

    if (partnerId) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, content, message_type, created_at, sender_id")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(3);

      (msgs || []).forEach((m) => {
        const isYou = m.sender_id === user.id;
        const preview = m.message_type === "image" ? "Shared a photo" : (m.content?.slice(0, 40) || "Message");
        items.push({
          id: `msg-${m.id}`, type: "message",
          label: isYou ? "You sent a message" : "Partner messaged you",
          detail: preview, time: new Date(m.created_at), route: "/chat",
          icon: activityIconMap.message, color: activityColorMap.message,
        });
      });

      const { data: photos } = await supabase
        .from("couple_photos")
        .select("id, created_at, user_id")
        .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
        .order("created_at", { ascending: false })
        .limit(2);

      (photos || []).forEach((p) => {
        items.push({
          id: `photo-${p.id}`, type: "photo",
          label: p.user_id === user.id ? "You uploaded a photo" : "Partner added a photo",
          detail: "New photo in gallery", time: new Date(p.created_at), route: "/us?tab=photos",
          icon: activityIconMap.photo, color: activityColorMap.photo,
        });
      });

      const { data: files } = await supabase
        .from("shared_files")
        .select("id, file_name, created_at, user_id")
        .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
        .order("created_at", { ascending: false })
        .limit(2);

      (files || []).forEach((f) => {
        items.push({
          id: `file-${f.id}`, type: "file",
          label: f.user_id === user.id ? "You uploaded a file" : "Partner shared a file",
          detail: f.file_name, time: new Date(f.created_at), route: "/us?tab=admin",
          icon: activityIconMap.file, color: activityColorMap.file,
        });
      });
    }

    const { data: tasks } = await supabase
      .from("weekly_tasks")
      .select("id, text, done, created_at, completed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2);

    (tasks || []).forEach((t) => {
      const doneRecently = t.done && t.completed_at;
      items.push({
        id: `task-${t.id}`, type: "task",
        label: doneRecently ? "Task completed" : "Task added",
        detail: t.text?.slice(0, 40) || "Weekly task",
        time: new Date(doneRecently ? t.completed_at! : t.created_at), route: "/us?tab=lists",
        icon: activityIconMap.task, color: activityColorMap.task,
      });
    });

    const { data: recentLists } = await supabase
      .from("shared_lists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(2);

    if (recentLists) {
      recentLists.forEach((l: any) => {
        items.push({
          id: `list-${l.id}`, type: "list",
          label: "List updated", detail: l.name,
          time: new Date(l.created_at || Date.now()), route: "/us?tab=lists",
          icon: activityIconMap.list, color: activityColorMap.list,
        });
      });
    }

    items.sort((a, b) => b.time.getTime() - a.time.getTime());
    setActivities(items.slice(0, 5));
  }

  if (loading) return null;

  const hasNowPlaying = nowPlaying?.isPlaying && nowPlaying.track;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      data-testid="our-board"
    >
      {/* Spotify section */}
      <div className="bg-gradient-to-br from-[#1DB954]/5 to-transparent">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SpotifyIcon className="w-5 h-5 text-[#1DB954]" />
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Spotify</span>
          </div>
          <button
            onClick={() => navigate("/us?tab=lists")}
            className="text-[10px] font-medium text-muted-foreground"
            data-testid="spotify-board-playlist-link"
          >
            Our Playlist &rarr;
          </button>
        </div>

        {hasNowPlaying && nowPlaying.track && (
          <a
            href={nowPlaying.track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 pb-3"
            data-testid="spotify-now-playing"
          >
            {nowPlaying.track.albumArt && (
              <img src={nowPlaying.track.albumArt} alt="" className="w-12 h-12 rounded-lg shadow-md flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                <span className="text-[10px] font-semibold text-[#1DB954] uppercase tracking-wider">Now Playing</span>
              </div>
              <p className="text-[13px] font-semibold text-foreground truncate">{nowPlaying.track.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{nowPlaying.track.artist}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
          </a>
        )}

        {!hasNowPlaying && recentTracks.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Recently Played</p>
            <div className="space-y-2">
              {recentTracks.map((track, i) => (
                <a
                  key={`${track.name}-${i}`}
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5"
                  data-testid={`spotify-recent-${i}`}
                >
                  {track.albumArt && (
                    <img src={track.albumArt} alt="" className="w-8 h-8 rounded-md flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-foreground truncate">{track.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {!hasNowPlaying && recentTracks.length === 0 && (
          <div className="px-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1DB954]/10 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-[#1DB954]/60" />
            </div>
            <p className="text-[12px] text-muted-foreground">Play something on Spotify to see it here</p>
          </div>
        )}
      </div>

      {/* What's New section */}
      {activities.length > 0 && (
        <>
          <div className="border-t border-border/50" />
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[hsl(var(--us-coral))]" />
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">What's New</span>
          </div>
          <div className="px-4 pb-3 pt-1 space-y-1 max-h-[160px] overflow-y-auto scrollbar-hide">
            {activities.map((a, i) => (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(a.route)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left"
                data-testid={`activity-${a.type}-${i}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                  {formatDistanceToNow(a.time, { addSuffix: true })}
                </span>
              </motion.button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default SpotifyBoard;
