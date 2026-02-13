import { Settings, Heart, LinkIcon, LogOut, Copy, Check, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const Profile = () => {
  const { user, profile, signOut, linkPartner, loading } = useAuth();
  const navigate = useNavigate();
  const [partnerCode, setPartnerCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCopyCode = () => {
    if (profile?.partner_code) {
      navigator.clipboard.writeText(profile.partner_code);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLinkPartner = async () => {
    if (!partnerCode.trim()) return;
    setLinking(true);
    const success = await linkPartner(partnerCode.trim());
    if (success) {
      toast.success("Partner linked! 🎉");
      setShowLinkInput(false);
      setPartnerCode("");
    } else {
      toast.error("Invalid code or partner not found");
    }
    setLinking(false);
  };

  const initials = profile?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Profile</h1>
          <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-6">
        {/* Profile card */}
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Avatar className="w-20 h-20 mx-auto mb-3">
            <AvatarFallback className="bg-gradient-to-br from-us-coral to-us-terracotta text-primary-foreground text-2xl font-display">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-display text-xl font-bold text-foreground">{profile?.username || "You"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.partner_id ? "Partner linked ❤️" : "Partner not linked yet"}
          </p>
        </div>

        {/* Partner code */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Your Partner Code
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Share this code with your partner so they can link with you.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-center text-lg font-mono font-bold text-foreground tracking-widest">
              {profile?.partner_code || "--------"}
            </code>
            <button
              onClick={handleCopyCode}
              className="rounded-lg bg-primary/10 p-2.5 text-primary hover:bg-primary/20 transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Link partner */}
        {!profile?.partner_id && (
          <div className="rounded-xl border border-border bg-card p-5">
            {!showLinkInput ? (
              <button
                onClick={() => setShowLinkInput(true)}
                className="w-full flex items-center gap-3 text-left"
              >
                <LinkIcon className="w-5 h-5 text-us-coral" />
                <div>
                  <span className="font-medium text-foreground text-sm">Enter Partner's Code</span>
                  <p className="text-xs text-muted-foreground">Link with your partner using their code</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Enter your partner's code</p>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLinkPartner()}
                    placeholder="e.g. a1b2c3d4"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleLinkPartner}
                    disabled={linking}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {linking ? "…" : "Link"}
                  </button>
                </div>
                <button onClick={() => setShowLinkInput(false)} className="text-xs text-muted-foreground">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Relationship stats */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-us-coral" /> Relationship Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">0</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Days Together</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">0</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Quizzes Done</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">0</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Games Played</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-border bg-card p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">Sign Out</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
