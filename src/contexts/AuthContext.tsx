import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string | null;
  partner_id: string | null;
  partner_code: string | null;
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
  linkPartnerByEmail: (email: string) => Promise<boolean>;
  linkPartnerByCode: (code: string) => Promise<boolean>;
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
      .select("id, username, partner_id, partner_code")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as any as Profile);
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

  const linkPartnerByEmail = async (email: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("link_partner_by_email" as any, { _partner_email: email });
    if (error || !data) return false;
    await refreshProfile();
    return true;
  };

  const linkPartnerByCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("link_partner" as any, { _partner_code: code });
    if (error || !data) return false;
    await refreshProfile();
    return true;
  };

  // App-wide presence tracking
  const partnerOnline = usePresence(user?.id, profile?.partner_id ?? undefined);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, partnerOnline, signUp, signInWithPassword, signOut, linkPartnerByEmail, linkPartnerByCode, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
