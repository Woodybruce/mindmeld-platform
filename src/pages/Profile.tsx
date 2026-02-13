import { Settings, Heart, LogOut, UserPlus, Mail, Sun, Moon, Monitor } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const Profile = () => {
  const { user, profile, signOut, linkPartnerByEmail, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  const quizCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("completedQuizzes") || "[]").length; } catch { return 0; }
  }, []);
  const listCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("userLists") || "[]").length; } catch { return 0; }
  }, []);

  if (loading) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleLinkPartner = async () => {
    if (!partnerEmail.trim()) return;
    setLinking(true);
    const success = await linkPartnerByEmail(partnerEmail.trim());
    if (success) {
      toast.success("Partner linked! 🎉");
      setShowLinkInput(false);
      setPartnerEmail("");
    } else {
      toast.error("Partner not found or already linked to someone else");
    }
    setLinking(false);
  };

  const initials = profile?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  const themeOptions = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "Auto" },
  ];

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

        {/* Link partner by email */}
        {!profile?.partner_id && (
          <div className="rounded-xl border border-border bg-card p-5">
            {!showLinkInput ? (
              <button
                onClick={() => setShowLinkInput(true)}
                className="w-full flex items-center gap-3 text-left"
              >
                <UserPlus className="w-5 h-5 text-primary" />
                <div>
                  <span className="font-medium text-foreground text-sm">Link Your Partner</span>
                  <p className="text-xs text-muted-foreground">Enter their email to connect your accounts</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Enter your partner's email</p>
                <p className="text-xs text-muted-foreground">They must have an account already</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      autoFocus
                      type="email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLinkPartner()}
                      placeholder="partner@email.com"
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
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

        {/* Theme selector */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">Appearance</h3>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${
                  theme === opt.value
                    ? "bg-primary/10 border-2 border-primary text-primary"
                    : "bg-secondary border-2 border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <opt.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Relationship stats */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-us-coral" /> Relationship Stats
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">{listCount}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Shared Lists</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">{quizCount}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Quizzes Done</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">1</span>
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
