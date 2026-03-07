import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useIsAdmin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return false;
      const res = await fetch("/api/is-admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return false;
      const json = await res.json();
      return json.admin === true;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
};
