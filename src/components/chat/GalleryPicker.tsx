import { useState, useEffect } from "react";
import { X, ImageIcon, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GalleryPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  url: string;
}

interface GalleryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

const GalleryPicker = ({ open, onClose, onSelect }: GalleryPickerProps) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      supabase
        .from("couple_photos")
        .select("id, storage_path, caption")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          const withUrls = (data || []).map((p) => ({
            ...p,
            url: supabase.storage.from("couple-photos").getPublicUrl(p.storage_path).data.publicUrl,
          }));
          setPhotos(withUrls);
          setLoading(false);
        });
    }
  }, [open, user]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-3 border-b border-border/50 bg-card/80 backdrop-blur-xl">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-[15px] font-semibold text-foreground font-body">Our Photos</h2>
            <span className="text-[12px] text-muted-foreground">{photos.length} photos</span>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-[3px] border-[hsl(var(--us-coral))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground px-6">
                <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">No photos yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Photos you share will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-[2px] p-[2px]">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      onSelect(photo.url);
                      onClose();
                    }}
                    className="relative aspect-square overflow-hidden bg-secondary active:opacity-70 transition-opacity"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Photo"}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GalleryPicker;
