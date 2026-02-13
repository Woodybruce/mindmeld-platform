import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Plus, ImageIcon, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  url: string;
}

const OurPhotos = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (user) fetchPhotos();
  }, [user]);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from("couple_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch photos:", error);
      return;
    }

    const withUrls = (data || []).map((p) => ({
      ...p,
      url: supabase.storage.from("couple-photos").getPublicUrl(p.storage_path).data.publicUrl,
    }));
    setPhotos(withUrls);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("couple-photos")
        .upload(path, file);

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { error: dbError } = await supabase
        .from("couple_photos")
        .insert({ user_id: user.id, storage_path: path, caption: file.name.replace(/\.[^/.]+$/, "") });

      if (dbError) {
        console.error("Failed to save photo metadata:", dbError);
      }
    }

    setUploading(false);
    fetchPhotos();
    toast({ title: "Photos uploaded ✓" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deletePhoto = async (photo: Photo) => {
    await supabase.storage.from("couple-photos").remove([photo.storage_path]);
    await supabase.from("couple_photos").delete().eq("id", photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    setSelectedPhoto(null);
    toast({ title: "Photo deleted" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your shared photo memories</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !user}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Add Photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, i) => (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-lg bg-secondary overflow-hidden group"
            >
              <img
                src={photo.url}
                alt={photo.caption || "Photo"}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-primary-foreground font-medium truncate">
                  {photo.caption}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        !uploading && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No photos yet. Add your first one!</p>
          </div>
        )
      )}

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !user}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40"
      >
        <Camera className="w-5 h-5" />
        <span>{uploading ? "Uploading…" : "Upload photos together"}</span>
      </motion.button>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.url} alt={selectedPhoto.caption || ""} className="w-full rounded-xl" />
            <div className="absolute top-2 right-2 flex gap-2">
              <button onClick={() => deletePhoto(selectedPhoto)} className="rounded-full bg-destructive/90 p-2 text-destructive-foreground">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedPhoto(null)} className="rounded-full bg-background/90 p-2 text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedPhoto.caption && (
              <p className="text-center text-sm text-primary-foreground mt-3">{selectedPhoto.caption}</p>
            )}
          </div>
        </div>
      )}

      {!user && (
        <p className="text-xs text-muted-foreground text-center">Sign in to upload photos</p>
      )}
    </div>
  );
};

export default OurPhotos;
