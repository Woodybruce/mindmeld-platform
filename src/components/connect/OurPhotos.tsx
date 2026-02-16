import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ImageIcon, X, MessageCircle, Upload, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Photo {
  id: string;
  storage_path: string;
  image_url: string;
  created_at: string;
  sender_name: string;
  source: "chat" | "upload";
}

const OurPhotos = () => {
  const { user, profile } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const partnerId = profile?.partner_id;

  const fetchPhotos = async () => {
    if (!user || !partnerId) return;
    setLoading(true);

    // Fetch chat photos
    const { data: chatData } = await supabase
      .from("messages")
      .select("id, image_url, created_at, sender_id")
      .eq("message_type", "image")
      .not("image_url", "is", null)
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: false });

    // Fetch uploaded photos
    const { data: uploadData } = await supabase
      .from("couple_photos")
      .select("id, storage_path, created_at, user_id")
      .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
      .order("created_at", { ascending: false });

    // Get partner name
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", partnerId)
      .single();
    const partnerName = partnerProfile?.username || "Partner";

    const chatPhotos: Photo[] = (chatData || []).map((msg) => ({
      id: msg.id,
      storage_path: "",
      image_url: msg.image_url!,
      created_at: msg.created_at,
      sender_name: msg.sender_id === user.id ? "You" : partnerName,
      source: "chat" as const,
    }));

    const uploadedPhotos: Photo[] = (uploadData || []).map((p) => {
      const { data: urlData } = supabase.storage
        .from("couple-photos")
        .getPublicUrl(p.storage_path);
      return {
        id: p.id,
        storage_path: p.storage_path,
        image_url: urlData.publicUrl,
        created_at: p.created_at,
        sender_name: p.user_id === user.id ? "You" : partnerName,
        source: "upload" as const,
      };
    });

    // Merge and sort by date
    const all = [...chatPhotos, ...uploadedPhotos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setPhotos(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
  }, [user, partnerId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("couple-photos")
      .upload(path, file);

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("couple_photos")
      .insert({ user_id: user.id, storage_path: path });

    if (dbError) {
      toast.error("Failed to save photo");
    } else {
      toast.success("Photo uploaded!");
      fetchPhotos();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 border-[3px] border-[hsl(var(--us-coral))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your shared photos</p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">{photos.length} photos</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.icloud.com/photos/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors px-2.5 py-1.5 rounded-full bg-secondary/60"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>iCloud</span>
          </a>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground px-3 py-1.5 rounded-full bg-[hsl(var(--us-coral))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Upload</span>
          </button>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, i) => (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square rounded-xl bg-secondary overflow-hidden group"
            >
              <img
                src={photo.image_url}
                alt="Shared photo"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white font-medium">{photo.sender_name}</p>
                  {photo.source === "chat" ? (
                    <MessageCircle className="w-3 h-3 text-white/70" />
                  ) : (
                    <Upload className="w-3 h-3 text-white/70" />
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Upload photos or share them in chat
          </p>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-foreground/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.image_url} alt="" className="w-full rounded-xl" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 rounded-full bg-background/90 p-2 text-foreground shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center mt-3">
              <p className="text-sm text-white/80 font-medium">{selectedPhoto.sender_name}</p>
              <p className="text-xs text-white/40">
                {new Date(selectedPhoto.created_at).toLocaleDateString("default", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <p className="text-xs text-muted-foreground text-center">Sign in to view photos</p>
      )}
    </div>
  );
};

export default OurPhotos;
