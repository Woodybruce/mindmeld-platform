import { Settings, Heart, LogOut, UserPlus, Mail, Sun, Moon, Monitor, Phone, Calendar, Copy, Check, RefreshCw, RotateCcw } from "lucide-react";
import OutlookEventPicker from "@/components/OutlookEventPicker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { user, profile, signOut, linkPartnerByEmail, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { forwardUrl, forwardToken, generateForwardToken } = useCalendarEvents();
  const navigate = useNavigate();
  const [partnerEmail, setPartnerEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [syncingOutlook, setSyncingOutlook] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState<boolean | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);

  const quizCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("completedQuizzes") || "[]").length; } catch { return 0; }
  }, []);
  const listCount = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("userLists") || "[]").length; } catch { return 0; }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data && (data as any).phone_number) {
          setPhoneNumber((data as any).phone_number);
        }
      });
    // Check if Outlook is connected
    supabase.from("microsoft_tokens").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setOutlookConnected(!!data));
  }, [user]);

  const connectOutlook = async () => {
    const redirectUri = `${window.location.origin}/outlook-callback`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/microsoft-auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      if (result.url) {
        const popup = window.open(result.url, "outlook-auth", "width=600,height=700,popup=yes");
        if (!popup) {
          // Popup blocked — fallback to same-window redirect
          window.location.href = result.url;
        }
      } else {
        toast.error("Failed to get Outlook login URL");
      }
    } catch {
      toast.error("Failed to connect to Outlook");
    }
  };

  const savePhoneNumber = async () => {
    if (!user) return;
    setSavingPhone(true);
    const { error } = await supabase.from("profiles").update({ phone_number: phoneNumber.trim() || null } as any).eq("id", user.id);
    if (error) {
      toast.error("Failed to save phone number");
    } else {
      toast.success("Phone number saved ✓");
    }
    setSavingPhone(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

        {/* Phone number */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4 text-[hsl(var(--us-sage))]" /> Partner's Phone Number
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Used to call your partner when they're offline</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+44 7700 900000"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={savePhoneNumber}
              disabled={savingPhone}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {savingPhone ? "…" : "Save"}
            </button>
          </div>
        </div>

        {/* Calendar Sync */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Calendar Sync
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Forward calendar invites from Outlook or Gmail to automatically add events to your shared calendar.
          </p>

          {forwardUrl ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your forwarding URL</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={forwardUrl}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground font-mono truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(forwardUrl);
                    setCopied(true);
                    toast.success("Copied to clipboard!");
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="rounded-lg bg-secondary p-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Outlook:</strong> Set up an auto-forward rule to send .ics invites to this URL via POST request.{" "}
                  <strong>Gmail:</strong> Forward .ics invite emails to this address.
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={async () => {
                setGeneratingToken(true);
                await generateForwardToken();
                toast.success("Forwarding address created!");
                setGeneratingToken(false);
              }}
              disabled={generatingToken}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {generatingToken ? "Creating…" : "Generate Forwarding Address"}
            </button>
          )}

          {/* Outlook Connection */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Outlook Calendar</p>
            {outlookConnected === null ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            ) : outlookConnected ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Outlook account connected
                </p>
                <button
                  onClick={() => setShowEventPicker(true)}
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Browse & Add Events
                </button>
              </div>
            ) : (
              <button
                onClick={connectOutlook}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Connect Outlook Account
              </button>
            )}
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Connect your Microsoft account to sync calendar events automatically.
            </p>
          </div>
        </div>

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

        {/* Reset App Data */}
        <button
          onClick={() => {
            if (!window.confirm("This will clear all local data (lists, quizzes, onboarding) and sign you out. Continue?")) return;
            localStorage.clear();
            signOut().then(() => navigate("/auth"));
          }}
          className="w-full rounded-xl border border-border bg-card p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors"
        >
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
          <div>
            <span className="font-medium text-foreground text-sm">Reset App Data</span>
            <p className="text-xs text-muted-foreground">Clear all local data and start fresh</p>
          </div>
        </button>

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

      {showEventPicker && (
        <OutlookEventPicker
          onClose={() => setShowEventPicker(false)}
          onImported={() => {
            toast.success("Events added to your shared calendar!");
          }}
        />
      )}
    </div>
  );
};

export default Profile;
