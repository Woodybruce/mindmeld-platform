import { useSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";
import { X, ChevronDown, ChevronUp } from "lucide-react";

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

export default function PersistentSpotifyPlayer() {
  const { player, stop, minimize, maximize } = useSpotifyPlayer();

  if (!player.type || !player.id) return null;

  const embedUrl = player.type === "track"
    ? `https://open.spotify.com/embed/track/${player.id}?utm_source=generator&theme=0`
    : `https://open.spotify.com/embed/playlist/${player.id}?utm_source=generator&theme=0`;

  const height = player.type === "playlist" ? 352 : 80;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[51] pointer-events-none safe-area-bottom">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div
          className="overflow-hidden transition-all duration-300 px-1.5"
          style={{
            height: player.minimized ? 0 : height + 6,
            opacity: player.minimized ? 0 : 1,
          }}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height={height}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-t-lg"
            data-testid="persistent-spotify-embed"
          />
        </div>
        <div className="flex items-center justify-between px-3 py-1 bg-[#191414] border-t border-[#1DB954]/30">
          <div className="flex items-center gap-2">
            <SpotifyIcon className="w-3.5 h-3.5 text-[#1DB954]" />
            <span className="text-[12px] text-white/60 font-medium uppercase tracking-wider">
              {player.type === "playlist" ? "Playlist" : "Now Playing"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={player.minimized ? maximize : minimize} className="p-1 text-white/60 hover:text-white" data-testid="toggle-player-size">
              {player.minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button onClick={stop} className="p-1 text-white/60 hover:text-white" data-testid="close-player">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
