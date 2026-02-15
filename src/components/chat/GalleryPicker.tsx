import { useState, useEffect } from "react";
import { X, ImageIcon } from "lucide-react";
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Our Photos</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No photos in your gallery yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 max-w-lg mx-auto">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => {
                  onSelect(photo.url);
                  onClose();
                }}
                className="relative aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity"
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
    </div>
  );
};

export default GalleryPicker;
