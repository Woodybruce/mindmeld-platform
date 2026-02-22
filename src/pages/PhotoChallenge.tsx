import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, Shuffle, Check, Upload, Image, X, Loader2 } from "lucide-react";
import { notifyPartner } from "@/lib/notifyPartner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const challenges = [
  "Take a selfie recreating your first photo together",
  "Photograph each other's hands intertwined",
  "Capture your partner's laugh — make them genuinely crack up first",
  "Take a photo of something that reminds you of your partner",
  "Recreate a famous movie kiss pose",
  "Photograph your partner from their most flattering angle",
  "Take a candid shot of your partner when they don't expect it",
  "Capture a shadow selfie together",
  "Photograph your matching outfits (style them first!)",
  "Take a photo at your favourite local spot together",
  "Capture a sunrise or sunset together in the same frame",
  "Take a photo that tells the story of your relationship",
  "Photograph your partner doing something they love",
  "Take a piggyback ride photo",
  "Capture a reflection photo of you both (mirror, window, puddle)",
  "Take the most dramatic 'movie poster' couple photo you can",
  "Photograph your partner's eyes up close",
  "Take a jumping photo together — bonus for synchronised jumps",
  "Capture your favourite meal together from above",
  "Take a 'then vs now' style photo recreating an old couple photo",
];

const PhotoChallenge = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (profile?.partner_id) {
      notifyPartner({ partnerId: profile.partner_id, title: "📸 Photo Challenge!", body: `${profile.username || "Your partner"} started a Photo Challenge`, route: "/photo-challenge" });
    }
  }, []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const challenge = challenges[currentIdx];

  const markDone = () => {
    setCompleted((prev) => new Set(prev).add(currentIdx));
  };

  const next = () => {
    setCurrentIdx((prev) => (prev + 1) % challenges.length);
  };

  const random = () => {
    const remaining = challenges.map((_, i) => i).filter((i) => !completed.has(i));
    if (remaining.length === 0) {
      setCompleted(new Set());
      setCurrentIdx(Math.floor(Math.random() * challenges.length));
    } else {
      setCurrentIdx(remaining[Math.floor(Math.random() * remaining.length)]);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to upload photos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/challenge-${currentIdx}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("couple-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Save reference in couple_photos table
      await supabase.from("couple_photos").insert({
        user_id: user.id,
        storage_path: path,
        caption: `📸 Photo Challenge #${currentIdx + 1}: ${challenge}`,
      });

      const { data: urlData } = supabase.storage.from("couple-photos").getPublicUrl(path);
      setUploadedPhotos((prev) => ({ ...prev, [currentIdx]: urlData.publicUrl }));

      // Auto-mark as done when photo uploaded
      setCompleted((prev) => new Set(prev).add(currentIdx));
      toast.success("Photo saved to your shared album! 🎉");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoUpload(file);
    e.target.value = "";
  };

  const removePhoto = () => {
    setUploadedPhotos((prev) => {
      const next = { ...prev };
      delete next[currentIdx];
      return next;
    });
    setCompleted((prev) => {
      const next = new Set(prev);
      next.delete(currentIdx);
      return next;
    });
  };

  const currentPhoto = uploadedPhotos[currentIdx];

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/us?tab=games")} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">📸 Photo Challenge</h1>
          </div>
          <span className="text-xs text-muted-foreground">{completed.size}/{challenges.length} done</span>
        </div>
      </header>

      <div className="px-4 py-8 space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          Complete each photo challenge together. No filters needed! 📷
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="rounded-2xl bg-gradient-to-br from-us-blush/20 to-us-coral/10 border border-border/30 p-6 text-center space-y-4"
          >
            {currentPhoto ? (
              <div className="relative rounded-xl overflow-hidden aspect-[4/3]">
                <img src={currentPhoto} alt="Challenge photo" className="w-full h-full object-cover" />
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-foreground" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                  <span className="text-[11px] text-white font-medium">Saved to Our Photos ✓</span>
                </div>
              </div>
            ) : (
              <>
                <Camera className="w-10 h-10 mx-auto text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Challenge #{currentIdx + 1}
                </p>
              </>
            )}

            <p className="font-display text-lg font-bold text-foreground leading-relaxed">
              {challenge}
            </p>

            {completed.has(currentIdx) && !currentPhoto && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-us-sage">
                <Check className="w-3.5 h-3.5" /> Completed!
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Upload photo button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 py-4 text-sm font-semibold text-primary transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </>
          ) : currentPhoto ? (
            <>
              <Image className="w-4 h-4" />
              Replace Photo
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Your Photo
            </>
          )}
        </button>

        <div className="flex gap-3">
          {!completed.has(currentIdx) && (
            <button
              onClick={markDone}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Check className="w-4 h-4" /> Done!
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            Next →
          </button>
        </div>

        <button
          onClick={random}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <Shuffle className="w-4 h-4" /> Random Challenge
        </button>
      </div>
    </div>
  );
};

export default PhotoChallenge;
