import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Music, ChevronDown, ChevronUp } from "lucide-react";
import { apiInvoke } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";

interface NowPlayingData {
  isPlaying?: boolean;
  track?: {
    id: string;
    name: string;
    artist: string;
    album: string;
    albumArt: string;
    spotifyUrl: string;
  };
}

interface RecentTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  spotifyUrl: string;
}

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const SpotifyBoard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const { playTrack, playPlaylist } = useSpotifyPlayer();
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistExpanded, setPlaylistExpanded] = useState(false);

  useEffect(() => {
    checkConnection();
    fetchData();
    loadPlaylistId();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadPlaylistId() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("shared_lists")
        .select("score_data")
        .eq("name", "__spotify_playlist__")
        .limit(1)
        .maybeSingle();
      const pid = (data?.score_data as any)?.playlistId;
      if (pid) {
        setPlaylistId(pid);
        setPlaylistName((data?.score_data as any)?.playlistName || "Our Playlist");
      }
    } catch {}
  }

  async function checkConnection() {
    try {
      const { data } = await apiInvoke("spotify/status", { method: "GET" });
      setConnected((data as any)?.connected ?? false);
    } catch {
      setConnected(false);
    }
  }

  async function fetchData() {
    await Promise.all([fetchNowPlaying(), fetchRecent()]);
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

  if (loading) return null;

  const hasNowPlaying = nowPlaying?.isPlaying && nowPlaying.track;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-[#1DB954]/5 to-[#191414]/5 overflow-hidden"
      data-testid="spotify-board"
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <SpotifyIcon className="w-5 h-5 text-[#1DB954]" />
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Spotify</span>
        </div>
        <button
          onClick={() => navigate("/us?tab=lists")}
          className="text-[14px] font-medium text-muted-foreground"
          data-testid="spotify-board-playlist-link"
        >
          Our Playlist &rarr;
        </button>
      </div>

      {hasNowPlaying && nowPlaying.track && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3" data-testid="spotify-now-playing">
            {nowPlaying.track.albumArt && (
              <img src={nowPlaying.track.albumArt} alt="" className="w-12 h-12 rounded-lg shadow-md flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                <span className="text-[14px] font-semibold text-[#1DB954] uppercase tracking-wider">Now Playing</span>
              </div>
              <p className="text-[13px] font-semibold text-foreground truncate">{nowPlaying.track.name}</p>
              <p className="text-[13px] text-muted-foreground truncate">{nowPlaying.track.artist}</p>
            </div>
            <button
              onClick={() => playTrack(nowPlaying.track!.id)}
              className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center text-white hover:scale-105 transition-transform shrink-0"
              data-testid="play-now-playing"
            >
              <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
      )}

      {!hasNowPlaying && recentTracks.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[14px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Recently Played</p>
          <div className="space-y-2">
            {recentTracks.map((track, i) => (
              <div key={`${track.id}-${i}`} data-testid={`spotify-recent-${i}`}>
                <div className="flex items-center gap-2.5">
                  {track.albumArt && (
                    <img src={track.albumArt} alt="" className="w-8 h-8 rounded-md flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-foreground truncate">{track.name}</p>
                    <p className="text-[14px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <button
                    onClick={() => playTrack(track.id)}
                    className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center text-white hover:scale-105 transition-transform shrink-0"
                    data-testid={`play-recent-${i}`}
                  >
                    <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasNowPlaying && recentTracks.length === 0 && (
        <div className="px-4 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1DB954]/10 flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5 text-[#1DB954]/60" />
          </div>
          {!connected ? (
            <div className="flex-1">
              <p className="text-[14px] text-foreground font-medium">Connect Spotify</p>
              <a href="/api/spotify/auth" className="text-[13px] text-[#1DB954] font-semibold hover:underline">Tap to authorize &rarr;</a>
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground">Play something on Spotify to see it here</p>
          )}
        </div>
      )}

      {playlistId && (
        <div className="border-t border-border/30">
          <button
            onClick={() => playPlaylist(playlistId)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            data-testid="toggle-home-playlist"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {playlistName || "Our Playlist"}
            </span>
            <svg className="w-4 h-4 ml-0.5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default SpotifyBoard;
