import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const PartnerAvatarUpload = () => {
  const { user, profile } = useAuth();
  const partnerId = profile?.partner_id;
  const [partnerName, setPartnerName] = useState("Partner");
  const [partnerAvatarUrl, setPartnerAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!partnerId) return;
    supabase.from("profiles").select("username, avatar_url").eq("id", partnerId).single()
      .then(({ data }) => {
        if (data?.username) setPartnerName(data.username);
        if ((data as any)?.avatar_url) setPartnerAvatarUrl((data as any).avatar_url);
      });
  }, [partnerId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partnerId) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${partnerId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

      // Update partner's profile with their new avatar
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url } as any)
        .eq("id", partnerId);

      if (updateError) throw updateError;

      setPartnerAvatarUrl(url);
      toast.success("Photo updated! ✓");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!partnerId) return;
    await supabase.from("profiles").update({ avatar_url: null } as any).eq("id", partnerId);
    setPartnerAvatarUrl(null);
    toast.success("Photo removed");
  };

  if (!partnerId) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground">Link your partner first to set their photo</p>
      </div>
    );
  }

  const initial = partnerName.charAt(0).toUpperCase();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground mb-1">Set {partnerName}'s Photo</p>
      <p className="text-xs text-muted-foreground mb-4">This is how they'll appear in chat</p>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="w-16 h-16">
            {partnerAvatarUrl && <AvatarImage src={partnerAvatarUrl} alt={partnerName} />}
            <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--us-blush))] to-[hsl(var(--us-coral))] text-primary-foreground text-xl font-display font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {partnerAvatarUrl ? "Change" : "Upload"}
          </button>
          {partnerAvatarUrl && (
            <button
              onClick={removeAvatar}
              className="rounded-xl bg-secondary px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerAvatarUpload;
