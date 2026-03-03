import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string | null;
  partner_id: string | null;
  partner_code: string | null;
  phone_number: string | null;
  ai_preferences: string | null;
}

interface LinkResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  partnerOnline: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  linkPartnerByEmail: (email: string) => Promise<LinkResult>;
  linkPartnerByCode: (code: string) => Promise<LinkResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const PROFILE_CACHE_KEY = "us-profile-cache";
const SESSION_CACHE_KEY = "us-session-cache";

function getCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function cacheProfile(p: Profile | null) {
  try {
    if (p) {
      const { phone_number, ai_preferences, ...safe } = p;
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(safe));
    }
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

function cacheUser(u: User | null) {
  try {
    if (u) localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {}
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = getCachedUser();
  const cachedProfile = getCachedProfile();
  const [user, setUser] = useState<User | null>(cachedUser);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedUser);

  const fetchProfile = async (userId: string) => {
    const [profileRes, prefsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, partner_id, partner_code, phone_number").eq("id", userId).single(),
      supabase.from("shared_lists").select("score_data").eq("user_id", userId).eq("name", "__ai_preferences__").maybeSingle(),
    ]);
    if (profileRes.data) {
      const aiPrefs = (prefsRes.data?.score_data as any)?.preferences || null;
      const p: Profile = {
        id: profileRes.data.id,
        username: profileRes.data.username,
        partner_id: profileRes.data.partner_id,
        partner_code: profileRes.data.partner_code,
        phone_number: (profileRes.data as any).phone_number ?? null,
        ai_preferences: aiPrefs,
      };
      setProfile(p);
      cacheProfile(p);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        cacheUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          cacheProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      cacheUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        cacheProfile(null);
        cacheUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const linkPartnerByEmail = async (email: string): Promise<LinkResult> => {
    if (profile?.partner_id) {
      return { success: false, error: "You already have a partner linked." };
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (trimmedEmail === user?.email?.toLowerCase()) {
      return { success: false, error: "You can't link with your own account." };
    }
    const { data, error } = await supabase.rpc("link_partner_by_email", { _partner_email: trimmedEmail });
    if (error) {
      console.error("link_partner_by_email error:", error);
      return { success: false, error: "Something went wrong. Please try again." };
    }
    if (!data) {
      return { success: false, error: "Could not find that account, or they already have a partner linked." };
    }
    await refreshProfile();
    return { success: true };
  };

  const linkPartnerByCode = async (code: string): Promise<LinkResult> => {
    if (profile?.partner_id) {
      return { success: false, error: "You already have a partner linked." };
    }
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return { success: false, error: "Please enter a valid invite code." };
    }
    const { data, error } = await supabase.rpc("link_partner", { _partner_code: trimmedCode });
    if (error) {
      console.error("link_partner error:", error);
      return { success: false, error: "Something went wrong. Please try again." };
    }
    if (!data) {
      return { success: false, error: "Invalid invite code. Ask your partner to share their code from their profile." };
    }
    await refreshProfile();
    return { success: true };
  };

  const partnerOnline = usePresence(user?.id, profile?.partner_id ?? undefined);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, partnerOnline, signUp, signInWithPassword, signOut, linkPartnerByEmail, linkPartnerByCode, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
