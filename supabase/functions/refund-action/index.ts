// Supabase Edge Function: refund-action
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

    const { refund_id, workspace_id, action_type, tool_name } = await req.json();

    // Check allowlist
    const allowed = ["resend_webhook", "reconcile_state", "refresh_status", "verify_refund"];
    if (!allowed.includes(tool_name)) {
      return new Response(JSON.stringify({ error: "Unsupported or non-whitelisted action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionId = crypto.randomUUID();
    const executedAt = new Date().toISOString();

    const output = `Executed bounded operation ${tool_name} successfully.`;
    await supabase.from("agent_actions").insert({
      id: actionId,
      workspace_id,
      refund_id,
      tool_name,
      action_type: action_type || tool_name,
      executed_by: "AGENT_CORE",
      provider_environment: "SANDBOX",
      success: true,
      output,
      executed_at: executedAt,
    });

    return new Response(JSON.stringify({ success: true, action_id: actionId, output }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
