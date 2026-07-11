import { Settings, Heart, LogOut, UserPlus, Mail, Sun, Moon, Monitor, Phone, Calendar, Copy, Check, RefreshCw, RotateCcw, Camera, Shield, Sparkles } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import PartnerAvatarUpload from "@/components/connect/PartnerAvatarUpload";
import PartnerInviteCard from "@/components/PartnerInviteCard";
import OutlookEventPicker from "@/components/OutlookEventPicker";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useSharedLists } from "@/hooks/useSharedLists";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/hooks/usePageTitle";

const Profile = () => {
  const { user, profile, signOut, linkPartnerByEmail, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  usePageTitle("Profile");
  const { data: isAdmin } = useIsAdmin();
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
  const [aiPreferences, setAiPreferences] = useState("");
  const [savingAiPrefs, setSavingAiPrefs] = useState(false);

  const [quizCount, setQuizCount] = useState(0);
  const { lists: sharedListsData } = useSharedLists();
  const listCount = sharedListsData.length;

  // Count this user's completed quiz sessions (real data, not a dead localStorage key)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("quiz_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .then(({ count }) => setQuizCount(count || 0));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data && data.phone_number) {
          setPhoneNumber(data.phone_number);
        }
      });
    supabase.from("microsoft_tokens").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setOutlookConnected(!!data));
    if (profile?.ai_preferences) setAiPreferences(profile.ai_preferences);
  }, [user, profile?.ai_preferences]);

  const connectOutlook = async () => {
    const redirectUri = `${window.location.origin}/outlook-callback`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `/api/microsoft-auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
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
    const { error } = await supabase.from("profiles").update({ phone_number: phoneNumber.trim() || null }).eq("id", user.id);
    if (error) {
      toast.error("Failed to save phone number");
    } else {
      toast.success("Phone number saved ✓");
    }
    setSavingPhone(false);
  };

  const saveAiPreferences = async () => {
    if (!user) return;
    setSavingAiPrefs(true);
    try {
      const trimmed = aiPreferences.trim();
      const { data: existing } = await supabase.from("shared_lists").select("id").eq("user_id", user.id).eq("name", "__ai_preferences__").maybeSingle();
      if (existing) {
        await supabase.from("shared_lists").update({ score_data: { preferences: trimmed } }).eq("id", existing.id);
      } else {
        await supabase.from("shared_lists").insert({ user_id: user.id, name: "__ai_preferences__", icon: "brain", items: [], score_data: { preferences: trimmed } });
      }
      toast.success("AI preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    }
    setSavingAiPrefs(false);
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
    const result = await linkPartnerByEmail(partnerEmail.trim());
    if (result.success) {
      toast.success("Partner linked! 🎉");
      setShowLinkInput(false);
      setPartnerEmail("");
    } else {
      toast.error(result.error || "Failed to link partner.");
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-area-top">
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

        {/* Partner Photo */}
        {profile?.partner_id && <PartnerAvatarUpload />}

        {/* Link partner — improved UX */}
        {!profile?.partner_id && <PartnerInviteCard />}

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
                <span className="text-[13px] font-medium">{opt.label}</span>
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

        {/* AI Preferences */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" /> AI Personalisation
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Tell us about yourselves so AI suggestions are more relevant — interests, hobbies, dietary needs, travel style, anniversary, anything you like.
          </p>
          <textarea
            value={aiPreferences}
            onChange={(e) => setAiPreferences(e.target.value)}
            placeholder={"e.g. We love hiking and cooking Italian food. We're vegetarian. Our anniversary is in June. We prefer city breaks over beach holidays. We have a dog called Milo."}
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            data-testid="input-ai-preferences"
          />
          <button
            onClick={saveAiPreferences}
            disabled={savingAiPrefs}
            className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50 w-full"
            data-testid="button-save-ai-preferences"
          >
            {savingAiPrefs ? "Saving…" : "Save Preferences"}
          </button>
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
              <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Your forwarding URL</p>
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
            <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Outlook Calendar</p>
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
            <p className="text-[14px] text-muted-foreground mt-1.5">
              Connect your Microsoft account to sync calendar events automatically.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-us-coral" /> Relationship Stats
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">{listCount}</span>
              <p className="text-[14px] text-muted-foreground mt-0.5">Shared Lists</p>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <span className="text-lg font-bold text-foreground">{quizCount}</span>
              <p className="text-[14px] text-muted-foreground mt-0.5">Quizzes Done</p>
            </div>
          </div>
        </div>

        {/* Reset App Data */}
        <button
          onClick={async () => {
            if (!window.confirm("This will DELETE all your messages, photos, quizzes, links, files, calendar events and clear local data. This cannot be undone. Continue?")) return;
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
              const uid = currentUser.id;
                await Promise.all([
                  supabase.from("messages").delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`),
                  supabase.from("couple_photos").delete().eq("user_id", uid),
                  supabase.from("quiz_answers").delete().in("session_id",
                    (await supabase.from("quiz_sessions").select("id").eq("user_id", uid)).data?.map(s => s.id) || []
                  ),
                  supabase.from("quiz_sessions").delete().eq("user_id", uid),
                  supabase.from("shared_links").delete().eq("user_id", uid),
                  supabase.from("shared_files").delete().eq("user_id", uid),
                  supabase.from("shared_folders").delete().eq("user_id", uid),
                  supabase.from("calendar_events").delete().eq("user_id", uid),
                  supabase.from("mood_checkins").delete().eq("user_id", uid),
                  supabase.from("shared_lists").delete().eq("user_id", uid),
                  supabase.from("weekly_tasks").delete().eq("user_id", uid),
                  supabase.from("content_likes").delete().eq("user_id", uid),
                  supabase.from("profiles").update({ anniversary_date: null }).eq("id", uid),
                ]);
              }
            } catch (e) {
              console.error("Reset error:", e);
            }
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

        {/* Admin link */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin/feed")}
            className="w-full rounded-xl border border-border bg-card p-4 text-left flex items-center gap-3 hover:bg-secondary/50 transition-colors"
          >
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <span className="font-medium text-foreground text-sm">Feed Content Manager</span>
              <p className="text-xs text-muted-foreground">Add, edit & manage home screen content</p>
            </div>
          </button>
        )}

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
