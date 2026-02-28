import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";


interface GifPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface GifResult {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

const GifPicker = ({ open, onClose, onSelect }: GifPickerProps) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchGifs = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const url = `/api/search-gifs?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error("Failed to fetch GIFs");
      const result = await res.json();
      setGifs(result.gifs || []);
    } catch (err: any) {
      setError("Unable to load GIFs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on open
  useEffect(() => {
    if (open && gifs.length === 0) {
      searchGifs("");
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchGifs(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-[15px] font-semibold text-foreground font-body">GIFs</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-secondary/70 rounded-xl px-3 py-2.5 border border-border/30">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto px-3 pb-5">
          {loading && gifs.length === 0 && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive text-center py-8">{error}</p>
          )}

          {!loading && !error && gifs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No GIFs found</p>
          )}

          <div className="columns-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => { onSelect(gif.url); onClose(); }}
                className="mb-2 w-full rounded-xl overflow-hidden hover:opacity-80 active:scale-95 transition-all break-inside-avoid"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full object-cover rounded-xl"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {!loading && gifs.length > 0 && (
            <p className="text-[12px] text-muted-foreground/40 text-center mt-3">Powered by GIPHY</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GifPicker;
