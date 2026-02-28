import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiInvoke } from "@/lib/api";

interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  spotifyUrl: string;
  uri: string;
  previewUrl?: string;
}

interface SpotifySongPickerProps {
  open: boolean;
  onClose: () => void;
  onSend: (data: { name: string; artist: string; albumArt: string; spotifyUrl: string }) => void;
}

const SpotifySongPicker = ({ open, onClose, onSend }: SpotifySongPickerProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await apiInvoke(`spotify/search?q=${encodeURIComponent(query.trim())}`, { method: "GET" });
      const resp = data as any;
      setResults(resp?.tracks || []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }

  function handleSelect(track: SpotifyTrack) {
    onSend({
      name: track.name,
      artist: track.artist,
      albumArt: track.albumArt,
      spotifyUrl: track.spotifyUrl,
    });
    setQuery("");
    setResults([]);
    onClose();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="bg-background w-full max-w-lg rounded-t-2xl max-h-[70vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <h3 className="font-semibold text-[15px]">Share a Song</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary" data-testid="spotify-picker-close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search for a song..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40"
                  autoFocus
                  data-testid="spotify-search-input"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#1DB954] text-white text-sm font-medium disabled:opacity-50"
                data-testid="spotify-search-btn"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {results.length === 0 && !searching && (
              <p className="text-center text-sm text-muted-foreground py-8">Search for a song to share with your partner</p>
            )}
            {searching && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#1DB954]" />
              </div>
            )}
            {results.map((track, i) => (
              <button
                key={`${track.uri}-${i}`}
                onClick={() => handleSelect(track)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/80 active:bg-secondary transition-colors text-left"
                data-testid={`spotify-track-${i}`}
              >
                {track.albumArt && <img src={track.albumArt} alt="" className="w-11 h-11 rounded-lg shadow-sm flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold truncate">{track.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{track.artist} · {track.album}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SpotifySongPicker;
