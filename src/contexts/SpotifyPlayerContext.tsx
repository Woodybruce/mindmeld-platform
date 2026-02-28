import { createContext, useContext, useState, useCallback } from "react";

type PlayerType = "track" | "playlist" | null;

interface SpotifyPlayerState {
  type: PlayerType;
  id: string | null;
  minimized: boolean;
}

interface SpotifyPlayerContextValue {
  player: SpotifyPlayerState;
  playTrack: (trackId: string) => void;
  playPlaylist: (playlistId: string) => void;
  stop: () => void;
  minimize: () => void;
  maximize: () => void;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextValue | null>(null);

export function SpotifyPlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<SpotifyPlayerState>({ type: null, id: null, minimized: false });

  const playTrack = useCallback((trackId: string) => {
    setPlayer({ type: "track", id: trackId, minimized: false });
  }, []);

  const playPlaylist = useCallback((playlistId: string) => {
    setPlayer({ type: "playlist", id: playlistId, minimized: false });
  }, []);

  const stop = useCallback(() => {
    setPlayer({ type: null, id: null, minimized: false });
  }, []);

  const minimize = useCallback(() => {
    setPlayer(prev => ({ ...prev, minimized: true }));
  }, []);

  const maximize = useCallback(() => {
    setPlayer(prev => ({ ...prev, minimized: false }));
  }, []);

  return (
    <SpotifyPlayerContext.Provider value={{ player, playTrack, playPlaylist, stop, minimize, maximize }}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

export function useSpotifyPlayer() {
  const ctx = useContext(SpotifyPlayerContext);
  if (!ctx) throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider");
  return ctx;
}
