// Supabase Edge Function: audit
// Computes cryptographic SHA-256 hash chains for tamper-evident event logging
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, workspace_id, entry } = await req.json();

    if (action === "VERIFY_CHAIN") {
      // Recompute entire chain to verify integrity
      const { data: logs, error } = await supabase
        .from("audit_events")
        .select("*")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      let valid = true;
      let prevHash = "0".repeat(64);
      for (const log of logs || []) {
        if (log.previous_hash !== prevHash) {
          valid = false;
          break;
        }
        const expected = await sha256(
          `${log.previous_hash}:${log.case_id}:${log.stage}:${log.action}:${log.created_at}`
        );
        if (log.event_hash !== expected) {
          valid = false;
          break;
        }
        prevHash = log.event_hash;
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: valid ? "AUDIT_INTEGRITY_VALID" : "AUDIT_INTEGRITY_COMPROMISED",
          count: logs?.length || 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "APPEND") {
      const { data: latest } = await supabase
        .from("audit_events")
        .select("event_hash")
        .eq("workspace_id", workspace_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const previous_hash = latest?.event_hash || "0".repeat(64);
      const createdAt = new Date().toISOString();
      const event_hash = await sha256(
        `${previous_hash}:${entry.case_id}:${entry.stage}:${entry.action}:${createdAt}`
      );

      const { data: inserted, error } = await supabase.from("audit_events").insert({
        id: crypto.randomUUID(),
        workspace_id,
        case_id: entry.case_id,
        stage: entry.stage,
        action: entry.action,
        actor: entry.actor || "AGENT_CORE",
        provider: entry.provider || "SANDBOX",
        message: entry.message,
        status: entry.status || "INFO",
        payload: entry.payload || {},
        previous_hash,
        event_hash,
        created_at: createdAt,
      }).select().single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, entry: inserted }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
