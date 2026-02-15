import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ImageIcon, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Photo {
  id: string;
  storage_path: string;
  image_url: string;
  created_at: string;
  sender_name: string;
}

const OurPhotos = () => {
  const { user, profile } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const partnerId = profile?.partner_id;

  useEffect(() => {
    if (!user || !partnerId) return;

    const fetchChatPhotos = async () => {
      setLoading(true);
      // Fetch all image messages between the couple
      const { data } = await supabase
        .from("messages")
        .select("id, image_url, created_at, sender_id")
        .eq("message_type", "image")
        .not("image_url", "is", null)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: false });

      if (data) {
        // Fetch partner name
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", partnerId)
          .single();

        const partnerName = partnerProfile?.username || "Partner";

        setPhotos(
          data.map((msg) => ({
            id: msg.id,
            storage_path: "",
            image_url: msg.image_url!,
            created_at: msg.created_at,
            sender_name: msg.sender_id === user.id ? "You" : partnerName,
          }))
        );
      }
      setLoading(false);
    };

    fetchChatPhotos();
  }, [user, partnerId]);

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
          <p className="text-sm text-muted-foreground">Photos shared in your chat</p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">{photos.length} photos</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>From chat</span>
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
                <p className="text-[10px] text-white font-medium">
                  {photo.sender_name}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Share photos in your chat and they'll appear here automatically
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
