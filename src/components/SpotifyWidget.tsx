import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Play, Pause, Plus, Trash2, ExternalLink, Search, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
);
import { apiInvoke } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SpotifyTrack {
  id: string;
  uri?: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUrl: string;
  durationMs?: number;
  progressMs?: number;
  playedAt?: string;
  addedAt?: string;
}

interface NowPlayingData {
  playing: boolean;
  isPlaying?: boolean;
  track?: SpotifyTrack;
}

export default function SpotifyWidget() {
  const { user, profile } = useAuth();
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const { playTrack, playPlaylist } = useSpotifyPlayer();

  useEffect(() => {
    loadPlaylistId();
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (playlistId) fetchPlaylist();
  }, [playlistId]);

  async function loadPlaylistId() {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("shared_lists")
        .select("id, score_data")
        .eq("name", "__spotify_playlist__")
        .limit(1)
        .maybeSingle();
      if (error) console.warn("Load playlist error:", error.message);
      const pid = (data?.score_data as any)?.playlistId;
      if (pid) {
        setPlaylistId(pid);
        setPlaylistName((data?.score_data as any)?.playlistName || "");
        setPlaylistUrl((data?.score_data as any)?.spotifyUrl || "");
      }
    } catch (e) {
      console.warn("Load playlist exception:", e);
    }
    setLoading(false);
  }

  async function savePlaylistId(id: string, name: string, url: string) {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from("shared_lists")
        .select("id")
        .eq("name", "__spotify_playlist__")
        .limit(1)
        .maybeSingle();

      const scoreData = { playlistId: id, playlistName: name, spotifyUrl: url };

      if (existing) {
        const { error } = await supabase
          .from("shared_lists")
          .update({ score_data: scoreData })
          .eq("id", existing.id);
        if (error) console.error("Update playlist error:", error.message);
      } else {
        const { error } = await supabase
          .from("shared_lists")
          .insert({
            user_id: user.id,
            name: "__spotify_playlist__",
            icon: "🎵",
            score_data: scoreData,
          });
        if (error) console.error("Insert playlist error:", error.message);
      }
    } catch (e) {
      console.error("Save playlist exception:", e);
    }
  }

  async function fetchNowPlaying() {
    try {
      const { data } = await apiInvoke("spotify/now-playing", { method: "GET" });
      setNowPlaying(data as NowPlayingData);
    } catch {
      setNowPlaying({ playing: false });
    }
  }

  async function fetchPlaylist() {
    if (!playlistId) return;
    try {
      const { data } = await apiInvoke(`spotify/playlist?playlistId=${playlistId}`, { method: "GET" });
      if (data) {
        const d = data as any;
        setPlaylistTracks(d.tracks || []);
        setPlaylistName(d.name || "Our Playlist");
        setPlaylistUrl(d.spotifyUrl || "");
      }
    } catch (e) {
      console.warn("Failed to load playlist:", e);
    }
  }

  async function createPlaylist() {
    setCreatingPlaylist(true);
    try {
      const coupleNames = profile?.username || "Us";
      const resp = await fetch("/api/spotify/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${coupleNames} — Our Playlist 💕`, description: "Songs we love together" }),
      });
      const d = await resp.json();
      if (resp.ok && d.id) {
        setPlaylistId(d.id);
        setPlaylistName(d.name);
        setPlaylistUrl(d.spotifyUrl);
        await savePlaylistId(d.id, d.name, d.spotifyUrl);
        toast.success("Playlist created!");
      } else {
        setShowLinkInput(true);
        toast.error("Auto-create blocked by Spotify — paste a playlist link instead");
      }
    } catch (e) {
      setShowLinkInput(true);
      toast.error("Auto-create blocked by Spotify — paste a playlist link instead");
    }
    setCreatingPlaylist(false);
  }

  function extractPlaylistId(input: string): string | null {
    const urlMatch = input.match(/playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) return input.trim();
    return null;
  }

  async function linkPlaylist() {
    const pid = extractPlaylistId(linkUrl);
    if (!pid) {
      toast.error("Paste a valid Spotify playlist link");
      return;
    }
    setCreatingPlaylist(true);
    try {
      const { data } = await apiInvoke(`spotify/playlist?playlistId=${pid}`, { method: "GET" });
      if (data) {
        const d = data as any;
        setPlaylistId(pid);
        setPlaylistName(d.name || "Our Playlist");
        setPlaylistUrl(d.spotifyUrl || `https://open.spotify.com/playlist/${pid}`);
        await savePlaylistId(pid, d.name || "Our Playlist", d.spotifyUrl || "");
        setShowLinkInput(false);
        setLinkUrl("");
        toast.success("Playlist linked!");
      } else {
        toast.error("Couldn't find that playlist — check the link");
      }
    } catch (e) {
      toast.error("Couldn't find that playlist — check the link");
    }
    setCreatingPlaylist(false);
  }

  async function searchTracks() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await apiInvoke(`spotify/search?q=${encodeURIComponent(searchQuery)}`, { method: "GET" });
      setSearchResults((data as any)?.tracks || []);
    } catch {
      toast.error("Search failed");
    }
    setSearching(false);
  }

  async function addToPlaylist(track: SpotifyTrack) {
    if (!playlistId || !track.uri) return;
    try {
      const resp = await fetch("/api/spotify/playlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, trackUri: track.uri }),
      });
      if (resp.ok) {
        toast.success(`Added "${track.name}"`);
        setSearchResults(prev => prev.filter(t => t.id !== track.id));
        fetchPlaylist();
      } else if (resp.status === 403) {
        window.open(track.spotifyUrl || `https://open.spotify.com/track/${track.id}`, "_blank");
        toast("Opened in Spotify — add it to the playlist from there", { duration: 4000 });
      } else {
        toast.error("Couldn't add track");
      }
    } catch {
      toast.error("Couldn't add track");
    }
  }

  async function removeFromPlaylist(track: SpotifyTrack) {
    if (!playlistId || !track.uri) return;
    try {
      const resp = await fetch("/api/spotify/playlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, trackUri: track.uri }),
      });
      if (resp.ok) {
        setPlaylistTracks(prev => prev.filter(t => t.id !== track.id));
        toast.success(`Removed "${track.name}"`);
      } else if (resp.status === 403) {
        toast("Remove it directly in Spotify — API restricted in dev mode", { duration: 4000 });
      } else {
        toast.error("Couldn't remove track");
      }
    } catch {
      toast.error("Couldn't remove track");
    }
  }

  function formatDuration(ms?: number) {
    if (!ms) return "";
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <SpotifyIcon className="w-5 h-5 text-[#1DB954]" />
          <span className="text-sm font-bold text-foreground">Spotify</span>
        </div>
        {playlistUrl && (
          <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-muted-foreground hover:text-[#1DB954] flex items-center gap-1">
            Open in Spotify <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {nowPlaying?.playing && nowPlaying.track && (
        <div className="px-4 py-3 bg-[#1DB954]/5 border-b border-border/30">
          <p className="text-[12px] uppercase tracking-wider font-semibold text-[#1DB954] mb-2 flex items-center gap-1.5">
            {nowPlaying.isPlaying ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {nowPlaying.isPlaying ? "Now Playing" : "Paused"}
          </p>
          <div className="flex items-center gap-3" data-testid="now-playing-link">
            {nowPlaying.track.albumArt && (
              <img src={nowPlaying.track.albumArt} alt="" className="w-12 h-12 rounded-lg shadow-md flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{nowPlaying.track.name}</p>
              <p className="text-xs text-muted-foreground truncate">{nowPlaying.track.artist}</p>
            </div>
            <button
              onClick={() => playTrack(nowPlaying.track!.id)}
              className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center text-white hover:scale-105 transition-transform shrink-0"
              data-testid="play-now-playing-widget"
            >
              <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
      )}

      {!playlistId ? (
        <div className="px-4 py-6 text-center">
          <Music className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">Your shared playlist</p>
          <p className="text-xs text-muted-foreground mb-3">Add songs together that you both love</p>

          {!showLinkInput ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={createPlaylist}
                disabled={creatingPlaylist}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1DB954]/90 transition-colors disabled:opacity-50"
                data-testid="create-playlist-btn"
              >
                {creatingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : <SpotifyIcon className="w-4 h-4" />}
                Create Playlist
              </button>
              <button
                onClick={() => setShowLinkInput(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-existing-playlist-btn"
              >
                or link an existing playlist
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
              <p className="text-xs text-muted-foreground">Create a playlist in Spotify, then paste the link here</p>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50"
                data-testid="playlist-link-input"
                onKeyDown={(e) => e.key === "Enter" && linkPlaylist()}
              />
              <div className="flex gap-2">
                <button
                  onClick={linkPlaylist}
                  disabled={creatingPlaylist || !linkUrl.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1DB954] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1DB954]/90 transition-colors disabled:opacity-50"
                  data-testid="link-playlist-btn"
                >
                  {creatingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Link Playlist
                </button>
                <button
                  onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
                  className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border transition-colors"
                  data-testid="cancel-link-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/50 transition-colors"
            data-testid="toggle-playlist"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {playlistName || "Our Playlist"}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2">
                  <iframe
                    src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
                    width="100%"
                    height="352"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-xl"
                    data-testid="spotify-playlist-embed"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
