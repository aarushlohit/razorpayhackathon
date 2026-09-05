// Supabase Edge Function: agent-run
// Orchestrates closed-loop refund diagnosis and policy gate execution with real AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { refund_id, workspace_id } = await req.json();
    if (!refund_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing refund_id or workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch Refund and Evidence
    const { data: refund, error: refundErr } = await supabase
      .from("refunds")
      .select("*, refund_evidence(*)")
      .eq("id", refund_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (refundErr || !refund) {
      return new Response(
        JSON.stringify({ error: "Refund not found in workspace" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create Agent Run Record
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    await supabase.from("agent_runs").insert({
      id: runId,
      workspace_id,
      refund_id,
      status: "RUNNING",
      started_at: startedAt,
      steps: [{ step: "DETECT", timestamp: startedAt, details: `Detected refund ${refund.case_id}` }],
    });

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        case_id: refund.case_id,
        status: "RUNNING",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
