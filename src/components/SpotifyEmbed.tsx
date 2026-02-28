import { useState } from "react";
import { Play } from "lucide-react";

interface SpotifyEmbedProps {
  trackId: string;
  compact?: boolean;
  autoPlay?: boolean;
}

export default function SpotifyEmbed({ trackId, compact = false, autoPlay = false }: SpotifyEmbedProps) {
  const [show, setShow] = useState(autoPlay);

  if (!show) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(true); }}
        className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-white hover:scale-105 transition-transform shrink-0"
        data-testid={`play-track-${trackId}`}
      >
        <Play className="w-4 h-4 ml-0.5" />
      </button>
    );
  }

  return (
    <iframe
      src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
      width="100%"
      height={compact ? 80 : 152}
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="rounded-xl"
      data-testid={`spotify-embed-${trackId}`}
    />
  );
}
