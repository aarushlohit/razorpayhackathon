import { z } from "zod";
import { DiagnosisResult, EvidencePackage, RefundCase } from "@/types";
import { formatEvidenceForPrompt } from "../agent/evidence-collector";

export const DiagnosisSchema = z.object({
  likely_stage: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
    z.enum([
      "webhook_missing",
      "bank_leg_stuck",
      "invalid_destination",
      "ledger_mismatch",
      "ambiguous",
    ])
  ),
  confidence: z.coerce.number().min(0).max(1),
  recommended_action: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
    z.enum([
      "resend_webhook",
      "reconcile_state",
      "refresh_status",
      "verify_refund",
      "escalate_to_human",
    ])
  ),
  reasoning: z.string().min(1),
  evidence_used: z.array(z.string()).default([]),
});

export type DiagnosisPayload = z.infer<typeof DiagnosisSchema>;

export function healAndParseJson<T = any>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "");
  cleaned = cleaned.replace(/```\s*$/im, "");
  // Extract first JSON object/array block
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    cleaned = match[1];
  }
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]\}])/g, "$1");
  return JSON.parse(cleaned) as T;
}

const SYSTEM_PROMPT = `You are the REFUND LOOP AI Payment Operations Diagnosis Engine.
Analyze the provided cross-system payment refund evidence (Gateway, Bank Settlement Leg, Webhook Dispatcher, Beneficiary Destination, Internal Ledger).
Determine the most likely failure stage, confidence score, recommended bounded action, and concise reasoning.

Return ONLY strict JSON matching this schema — no prose, no markdown:
{
  "likely_stage": "webhook_missing" | "bank_leg_stuck" | "invalid_destination" | "ledger_mismatch" | "ambiguous",
  "confidence": <number between 0.00 and 1.00 — if signals conflict or are missing, confidence MUST be <= 0.70>,
  "recommended_action": "resend_webhook" | "reconcile_state" | "refresh_status" | "verify_refund" | "escalate_to_human",
  "reasoning": "<Concise 1-2 sentence explanation citing specific evidence signals.>",
  "evidence_used": ["<signal 1>", "<signal 2>"]
}`;

// Whether to skip a provider when it returns a permanent failure code
function isPermanentFailure(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

export async function runAIDiagnosis(
  refundCase: RefundCase,
  evidence: EvidencePackage,
  keyOverride?: { provider?: string; apiKey?: string }
): Promise<DiagnosisResult> {
  const prompt = formatEvidenceForPrompt(evidence, refundCase);
  const startedAt = Date.now();

  // Overall 35-second deadline across all provider attempts
  const overallDeadline = startedAt + 35_000;

  const geminiKey =
    keyOverride?.provider === "gemini" && keyOverride.apiKey
      ? keyOverride.apiKey
      : process.env.GEMINI_API_KEY;

  const nvidiaKey =
    keyOverride?.provider === "nvidia" && keyOverride.apiKey
      ? keyOverride.apiKey
      : process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY;

  const openCodeKey =
    keyOverride?.provider === "opencode" && keyOverride.apiKey
      ? keyOverride.apiKey
      : process.env.OPENCODE_API_KEY;

  const timeRemaining = () => Math.max(0, overallDeadline - Date.now());

  // ─── 1. Google Gemini (PRIMARY) ────────────────────────────────────────────
  if (geminiKey && timeRemaining() > 3000) {
    const models = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
    for (const model of models) {
      if (timeRemaining() < 3000) break;
      try {
        const reqStart = Date.now();
        const timeout = Math.min(28_000, timeRemaining() - 1000);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${SYSTEM_PROMPT}\n\nEvidence Details:\n${prompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(timeout),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawContent) {
            try {
              const parsed = healAndParseJson(rawContent);
              const validated = DiagnosisSchema.safeParse(parsed);
              if (validated.success) {
                console.log(`[AI] Gemini (${model}) succeeded in ${Date.now() - reqStart}ms`);
                return {
                  ...validated.data,
                  provider: "gemini",
                  model,
                  raw_response: rawContent,
                  latency_ms: Date.now() - reqStart,
                };
              } else {
                console.warn(`[AI] Gemini (${model}) returned invalid schema:`, validated.error.format());
              }
            } catch (parseErr: any) {
              console.warn(`[AI] Gemini (${model}) JSON parse failed:`, parseErr?.message, rawContent?.slice(0, 200));
            }
          } else {
            console.warn(`[AI] Gemini (${model}) returned empty content. Full response:`, JSON.stringify(data).slice(0, 400));
          }
        } else {
          const status = res.status;
          const errBody = await res.text().catch(() => "");
          console.warn(`[AI] Gemini (${model}) HTTP ${status}:`, errBody.slice(0, 300));
          // Skip remaining models on permanent failures (bad key, not found)
          if (isPermanentFailure(status)) break;
        }
      } catch (err: any) {
        console.warn(`[AI] Gemini (${model}) exception: ${err?.message}`);
      }
    }
  }

  // ─── 2. NVIDIA NIM ─────────────────────────────────────────────────────────
  if (nvidiaKey && timeRemaining() > 3000) {
    try {
      const reqStart = Date.now();
      const nimModels = ["moonshotai/kimi-k3", "meta/llama-3.2-90b-vision-instruct"];
      for (const nimModel of nimModels) {
        if (timeRemaining() < 3000) break;
        try {
          const reqStart = Date.now();
          const timeout = Math.min(20_000, timeRemaining() - 1000);
          const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${nvidiaKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: nimModel,
              messages: [
                { role: "system", content: "You are Yokai AI. Output strict JSON only matching the requested schema." },
                { role: "user", content: `${SYSTEM_PROMPT}\n\nEvidence Details:\n${prompt}` },
              ],
              temperature: 0.2,
              response_format: { type: "json_object" },
              max_tokens: 1024,
            }),
            signal: AbortSignal.timeout(timeout),
          });

          if (res.ok) {
            const data = await res.json();
            const rawContent = data?.choices?.[0]?.message?.content;
            if (rawContent) {
              try {
                const parsed = healAndParseJson(rawContent);
                const validated = DiagnosisSchema.safeParse(parsed);
                if (validated.success) {
                  console.log(`[AI] NVIDIA NIM (${nimModel}) succeeded in ${Date.now() - reqStart}ms`);
                  return {
                    ...validated.data,
                    provider: "nvidia",
                    model: nimModel,
                    raw_response: rawContent,
                    latency_ms: Date.now() - reqStart,
                  };
                } else {
                  console.warn(`[AI] NVIDIA NIM (${nimModel}) invalid schema:`, validated.error.format());
                }
              } catch (parseErr: any) {
                console.warn(`[AI] NVIDIA NIM (${nimModel}) parse failed:`, parseErr?.message);
              }
            }
          } else {
            const status = res.status;
            const errBody = await res.text().catch(() => "");
            console.warn(`[AI] NVIDIA NIM (${nimModel}) HTTP ${status}:`, errBody.slice(0, 300));
          }
        } catch (err: any) {
          console.warn(`[AI] NVIDIA NIM (${nimModel}) exception: ${err?.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`[AI] NVIDIA NIM outer exception: ${err?.message}`);
    }
  }

  // ─── 3. OpenCode Zen ────────────────────────────────────────────────────────
  if (openCodeKey && timeRemaining() > 3000) {
    const openCodeModels = [
      "ling-3.0-flash-fin-free",
      "nemotron-3.5-lightning-free",
      "mimo-v2.5-free",
      "big-pickle",
      "hy3-free",
      "nemotron-3-ultra-free",
    ];

    for (const ocModel of openCodeModels) {
      if (timeRemaining() < 3000) break;
      try {
        const reqStart = Date.now();
        const timeout = Math.min(15_000, timeRemaining() - 1000);
        const res = await fetch("https://opencode.ai/zen/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openCodeKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ocModel,
            messages: [
              { role: "system", content: "You are Yokai AI document assistant. Return valid JSON only." },
              { role: "user", content: `${SYSTEM_PROMPT}\n\nEvidence Details:\n${prompt}` },
            ],
            temperature: 0.2,
          }),
          signal: AbortSignal.timeout(timeout),
        });

        if (res.ok) {
          const data = await res.json();
          const rawContent = data?.choices?.[0]?.message?.content;
          if (rawContent) {
            try {
              const parsed = healAndParseJson(rawContent);
              const validated = DiagnosisSchema.safeParse(parsed);
              if (validated.success) {
                console.log(`[AI] OpenCode Zen (${ocModel}) succeeded in ${Date.now() - reqStart}ms`);
                return {
                  ...validated.data,
                  provider: "opencode",
                  model: ocModel,
                  raw_response: rawContent,
                  latency_ms: Date.now() - reqStart,
                };
              } else {
                console.warn(`[AI] OpenCode (${ocModel}) invalid schema:`, validated.error.format());
              }
            } catch (parseErr: any) {
              console.warn(`[AI] OpenCode (${ocModel}) parse failed:`, parseErr?.message);
            }
          }
        } else {
          const status = res.status;
          const errBody = await res.text().catch(() => "");
          console.warn(`[AI] OpenCode (${ocModel}) HTTP ${status}:`, errBody.slice(0, 300));
        }
      } catch (err: any) {
        console.warn(`[AI] OpenCode (${ocModel}) exception: ${err?.message}`);
      }
    }
  }

  // ─── ALL PROVIDERS FAILED — Honest unavailable state ──────────────────────
  console.error(`[AI] All providers failed after ${Date.now() - startedAt}ms. Keys present: Gemini=${!!geminiKey}, NVIDIA=${!!nvidiaKey}, OpenCode=${!!openCodeKey}`);
  return {
    likely_stage: "ambiguous",
    confidence: 0.0,
    recommended_action: "escalate_to_human",
    reasoning:
      "AI provider unavailable or all providers returned invalid responses. Real AI API key required for autonomous diagnosis. Human review required.",
    evidence_used: [],
    provider: "AI_UNAVAILABLE",
    model: "none",
    error: "No active AI provider returned a valid schema-compliant diagnosis.",
    latency_ms: Date.now() - startedAt,
  };
}
