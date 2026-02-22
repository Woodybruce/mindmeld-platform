import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, Check, Mail, Link2, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PartnerInviteCard = () => {
  const { user, profile, linkPartnerByEmail } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [email, setEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [mode, setMode] = useState<"link" | "email">("link");

  if (profile?.partner_id) return null;

  const inviteUrl = `${window.location.origin}/auth?invite=${profile?.partner_code || ""}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Us",
          text: "Let's connect on Us — our private couples app!",
          url: inviteUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const handleLinkEmail = async () => {
    if (!email.trim()) return;
    setLinking(true);
    const result = await linkPartnerByEmail(email.trim());
    if (result.success) {
      toast.success("Partner linked! 🎉");
      setEmail("");
    } else {
      toast.error(result.error || "Failed to link partner.");
    }
    setLinking(false);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite Your Partner</span>
      </div>

      <div className="flex gap-1 mb-3 bg-secondary rounded-xl p-0.5">
        <button
          onClick={() => setMode("link")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === "link" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Link2 className="w-3 h-3 inline mr-1" /> Share Link
        </button>
        <button
          onClick={() => setMode("email")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Mail className="w-3 h-3 inline mr-1" /> By Email
        </button>
      </div>

      {mode === "link" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground font-mono truncate"
            />
            <button
              onClick={copyLink}
              className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={shareLink}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

          {showQR && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex justify-center pt-2"
            >
              <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl" />
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">They must have an account already</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLinkEmail()}
              placeholder="partner@email.com"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleLinkEmail}
              disabled={linking}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {linking ? "…" : "Link"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PartnerInviteCard;
