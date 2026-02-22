import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ImageIcon, X, MessageCircle, Upload, Loader2, Camera, MoreHorizontal, Trash2 } from "lucide-react";
import { SkeletonPhotoGrid } from "@/components/SkeletonCard";
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
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
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
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("couple-photos")
        .upload(path, file);

      if (uploadError) {
        toast.error(`Upload failed: ${file.name}`);
        continue;
      }

      const { error: dbError } = await supabase
        .from("couple_photos")
        .insert({ user_id: user.id, storage_path: path });

      if (dbError) {
        toast.error(`Failed to save: ${file.name}`);
      }
    }

    toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded!`);
    fetchPhotos();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
          </div>
        </div>
        <SkeletonPhotoGrid />
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground px-3 py-1.5 rounded-full bg-[hsl(var(--us-coral))] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            <span>{uploading ? "Uploading…" : "Add Photos"}</span>
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
              <div className="absolute top-1.5 right-1.5">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === photo.id ? null : photo.id); }}
                    className="p-1 rounded-md bg-foreground/40 backdrop-blur-sm hover:bg-foreground/60 transition-colors"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 text-white" />
                  </button>
                  {openActionMenu === photo.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(null); }} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                        <div className="px-3 py-1.5 text-[11px] text-muted-foreground">
                          {photo.sender_name} · {photo.source === "chat" ? "Chat" : "Upload"}
                        </div>
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setOpenActionMenu(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /> View
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-to-br from-us-blush/10 to-us-coral/5 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-us-coral/10 flex items-center justify-center mx-auto mb-3">
            <Camera className="w-7 h-7 text-[hsl(var(--us-coral))]" />
          </div>
          <p className="font-display text-base font-semibold text-foreground">Start your photo album</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] mx-auto">
            Upload your favourite couple photos or share them in chat — they'll appear here ✨
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground px-4 py-2 rounded-full bg-[hsl(var(--us-coral))] hover:opacity-90 transition-opacity"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Upload Photos
          </button>
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
