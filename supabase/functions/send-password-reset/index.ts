import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { email } = await req.json();
  
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Generate a password reset link
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: "https://mindmeld-platform.lovable.app/reset-password",
    },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Also send the reset email via the standard method
  const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: "https://mindmeld-platform.lovable.app/reset-password",
  });

  return new Response(JSON.stringify({ success: true, resetError: resetError?.message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
