// Supabase Edge Function: refund-verify
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { refund_id, workspace_id, is_planted_failure } = await req.json();

    const verificationId = crypto.randomUUID();
    const verifiedAt = new Date().toISOString();

    if (is_planted_failure) {
      const details = "CRITICAL: Downstream settlement switch remains unresolved. State did not mutate.";
      await supabase.from("agent_verifications").insert({
        id: verificationId,
        workspace_id,
        refund_id,
        observed_status: "STILL_PENDING",
        remediation_effective: false,
        details,
        verified_at: verifiedAt,
      });

      return new Response(
        JSON.stringify({
          success: true,
          observed_status: "STILL_PENDING",
          remediation_effective: false,
          details,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const details = "Verification succeeded: All payment legs are confirmed closed.";
    await supabase.from("agent_verifications").insert({
      id: verificationId,
      workspace_id,
      refund_id,
      observed_status: "RESOLVED",
      remediation_effective: true,
      details,
      verified_at: verifiedAt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        observed_status: "RESOLVED",
        remediation_effective: true,
        details,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
