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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, partner_id, partner_code, phone_number")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile({
        id: data.id,
        username: data.username,
        partner_id: data.partner_id,
        partner_code: data.partner_code,
        phone_number: (data as any).phone_number ?? null,
      });
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
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
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
