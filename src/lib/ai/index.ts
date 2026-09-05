import { z } from "zod";
import { DiagnosisResult, EvidencePackage, RefundCase } from "@/types";
import { formatEvidenceForPrompt } from "../agent/evidence-collector";

export const EvidenceEvaluationSchema = z.union([
  z.object({
    source: z.string().default("telemetry"),
    observed: z.string(),
    interpretation: z.string().default(""),
    supports: z.boolean().default(true),
  }),
  z.string().transform((str) => ({
    source: "telemetry",
    observed: str,
    interpretation: str,
    supports: true,
  })),
]);

export const HypothesisSchema = z.object({
  label: z.string(),
  confidence: z.coerce.number().min(0).max(1),
  code: z.string().optional(),
});

export const AIAssessmentSchema = z.object({
  primary_hypothesis: z.object({
    code: z.string(),
    label: z.string(),
    confidence: z.coerce.number().min(0).max(1),
  }),
  summary: z.string().min(1),
  evidence: z.array(EvidenceEvaluationSchema).default([]),
  alternative_hypotheses: z.array(HypothesisSchema).default([]),
  recommended_action: z.object({
    action: z.preprocess(
      (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
      z.enum([
        "resend_webhook",
        "reconcile_state",
        "refresh_status",
        "verify_refund",
        "escalate_to_human",
      ])
    ),
    reason: z.string(),
  }),
  uncertainty: z.string().optional(),
});

export const DiagnosisSchema = z.object({
  assessment: AIAssessmentSchema.optional(),
  // Top-level fallbacks / legacy compatibility mappings:
  likely_stage: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
    z.enum([
      "webhook_missing",
      "bank_leg_stuck",
      "invalid_destination",
      "ledger_mismatch",
      "ambiguous",
    ])
  ).optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  recommended_action: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
    z.enum([
      "resend_webhook",
      "reconcile_state",
      "refresh_status",
      "verify_refund",
      "escalate_to_human",
    ])
  ).optional(),
  reasoning: z.string().optional(),
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

const SYSTEM_PROMPT = `You are a payment operations investigation agent.
You are given telemetry from multiple independent payment subsystems (Gateway, Settlement Leg, Webhook Dispatcher, Beneficiary Destination, Internal Ledger).

EVIDENCE GROUNDING & ANTI-HALLUCINATION RULES:
1. You may only infer from the supplied evidence.
2. DO NOT invent payment-network events, bank responses, NPCI behavior, beneficiary account freezes, gateway statuses, or internal provider telemetry that is not explicitly present in the evidence.
3. Do not simply map a status code to a diagnosis. Reason across the cross-system evidence.
4. Identify the strongest primary hypothesis and consider alternative competing explanations.
5. Explain which observations support or contradict each hypothesis.
6. Do not invent HTTP codes, error IDs, or entity identifiers not supplied.
7. Do not claim high certainty when evidence is contradictory, missing, or incomplete. If telemetry is ambiguous or conflicting, confidence MUST be between 0.40 and 0.70 and recommended action must be escalate_to_human.
8. Recommend an action only when the evidence supports it.
9. Your recommendation is NOT authorization to execute. A separate agentic policy engine controls execution.

Return strict JSON only matching this schema — no markdown, no conversational text:
{
  "assessment": {
    "primary_hypothesis": {
      "code": "WEBHOOK_DELIVERY_FAILURE" | "BANK_LEG_STALLED" | "INVALID_DESTINATION" | "LEDGER_DESYNCHRONIZATION" | "INCOMPLETE_TELEMETRY",
      "label": "<Clear human-readable hypothesis title>",
      "confidence": <number between 0.00 and 1.00>
    },
    "summary": "<Concise 1-2 sentence evidence-backed assessment of what occurred>",
    "evidence": [
      {
        "source": "settlement" | "webhook_dispatcher" | "beneficiary_destination" | "merchant_ledger" | "payment_gateway",
        "observed": "<exact observed value from telemetry>",
        "interpretation": "<what this observation implies>",
        "supports": true | false
      }
    ],
    "alternative_hypotheses": [
      {
        "label": "<competing plausible explanation>",
        "confidence": <number between 0.01 and 0.30>
      }
    ],
    "recommended_action": {
      "action": "resend_webhook" | "reconcile_state" | "refresh_status" | "verify_refund" | "escalate_to_human",
      "reason": "<Specific operational rationale why this action is safe and addresses the failing layer>"
    },
    "uncertainty": "<What cannot be proven from supplied telemetry alone>"
  },
  "confidence": <number equal to primary_hypothesis.confidence>
}`;

// Whether to skip a provider when it returns a permanent failure code
function isPermanentFailure(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

// Map rich assessment to top-level diagnosis fields
export function normalizeDiagnosisResult(parsed: any): DiagnosisResult {
  const assessment = parsed.assessment;
  
  let likely_stage = parsed.likely_stage;
  let confidence = parsed.confidence;
  let recommended_action = parsed.recommended_action;
  let reasoning = parsed.reasoning;
  let evidence_used = parsed.evidence_used || [];

  if (assessment) {
    confidence = assessment.primary_hypothesis?.confidence ?? confidence ?? 0.5;
    const rawCode = (assessment.primary_hypothesis?.code || "").toUpperCase();
    if (rawCode.includes("WEBHOOK")) likely_stage = "webhook_missing";
    else if (rawCode.includes("BANK") || rawCode.includes("SWITCH")) likely_stage = "bank_leg_stuck";
    else if (rawCode.includes("DESTINATION") || rawCode.includes("VPA") || rawCode.includes("IFSC")) likely_stage = "invalid_destination";
    else if (rawCode.includes("LEDGER") || rawCode.includes("RECONCIL")) likely_stage = "ledger_mismatch";
    else likely_stage = "ambiguous";

    if (assessment.recommended_action) {
      if (typeof assessment.recommended_action === "string") {
        recommended_action = assessment.recommended_action;
      } else if (assessment.recommended_action.action) {
        recommended_action = assessment.recommended_action.action;
      }
    }

    reasoning = assessment.summary || reasoning || assessment.primary_hypothesis?.label || "AI assessment generated from cross-system payment evidence.";

    if (Array.isArray(assessment.evidence)) {
      evidence_used = assessment.evidence.map((e: any) => `${e.source}: ${e.observed} (${e.interpretation})`);
    }
  }

  // Fallbacks if missing
  if (!likely_stage) likely_stage = "ambiguous";
  if (confidence === undefined || confidence === null) confidence = 0.5;
  if (!recommended_action) recommended_action = "escalate_to_human";
  if (!reasoning) reasoning = "Cross-system payment evidence correlation completed.";

  return {
    likely_stage,
    confidence,
    recommended_action,
    reasoning,
    evidence_used,
    assessment,
    provider: "gemini",
  };
}

export async function runAIDiagnosis(
  refundCase: RefundCase,
  evidence: EvidencePackage,
  keyOverride?: { provider?: string; apiKey?: string }
): Promise<DiagnosisResult> {
  const prompt = formatEvidenceForPrompt(evidence, refundCase);
  const startedAt = Date.now();

  // Overall 50-second deadline across all provider attempts
  const overallDeadline = startedAt + 50_000;

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

  const preferredProvider = keyOverride?.provider;

  async function tryGemini(): Promise<DiagnosisResult | null> {
    if (!geminiKey || timeRemaining() < 2500) return null;
    const models = ["gemini-2.5-flash", "gemini-3-flash-preview"];
    for (const model of models) {
      if (timeRemaining() < 2500) break;
      try {
        const reqStart = Date.now();
        const timeout = Math.min(12_000, timeRemaining() - 300);
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
                const normalized = normalizeDiagnosisResult(validated.data);
                return {
                  ...normalized,
                  provider: "gemini",
                  model,
                  raw_response: rawContent,
                  latency_ms: Date.now() - reqStart,
                };
              } else {
                console.warn(`[AI] Gemini (${model}) schema invalid:`, validated.error.format());
              }
            } catch (parseErr: any) {
              console.warn(`[AI] Gemini (${model}) parse failed:`, parseErr?.message);
            }
          }
        } else {
          const status = res.status;
          const errBody = await res.text().catch(() => "");
          console.warn(`[AI] Gemini (${model}) HTTP ${status}:`, errBody.slice(0, 200));
          if (status === 429 || isPermanentFailure(status)) {
            // Quota exhausted or invalid key — break out to let next provider execute immediately
            break;
          }
        }
      } catch (err: any) {
        console.warn(`[AI] Gemini (${model}) error: ${err?.message}`);
      }
    }
    return null;
  }

  async function tryOpenCode(): Promise<DiagnosisResult | null> {
    if (!openCodeKey || timeRemaining() < 2500) return null;
    const openCodeModels = [
      "ling-3.0-flash-fin-free",
      "mimo-v2.5-free",
    ];
    for (const ocModel of openCodeModels) {
      if (timeRemaining() < 2500) break;
      try {
        const reqStart = Date.now();
        const timeout = Math.min(10_000, timeRemaining() - 300);
        const res = await fetch("https://opencode.ai/zen/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openCodeKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ocModel,
            messages: [
              { role: "system", content: "You are an expert payment investigation agent. Output strict valid JSON only matching the schema." },
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
                const normalized = normalizeDiagnosisResult(validated.data);
                return {
                  ...normalized,
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
          console.warn(`[AI] OpenCode (${ocModel}) HTTP ${status}:`, errBody.slice(0, 200));
        }
      } catch (err: any) {
        console.warn(`[AI] OpenCode (${ocModel}) error: ${err?.message}`);
      }
    }
    return null;
  }

  async function tryNvidia(): Promise<DiagnosisResult | null> {
    if (!nvidiaKey || timeRemaining() < 2500) return null;
    const nimModels = ["meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct"];
    for (const nimModel of nimModels) {
      if (timeRemaining() < 2500) break;
      try {
        const reqStart = Date.now();
        const timeout = Math.min(25_000, timeRemaining() - 300);
        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: nimModel,
            messages: [
              { role: "system", content: "You are an expert payment operations agent. Output strict valid JSON only matching the schema." },
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
                const normalized = normalizeDiagnosisResult(validated.data);
                return {
                  ...normalized,
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
          console.warn(`[AI] NVIDIA NIM (${nimModel}) HTTP ${status}:`, errBody.slice(0, 200));
        }
      } catch (err: any) {
        console.warn(`[AI] NVIDIA NIM (${nimModel}) error: ${err?.message}`);
      }
    }
    return null;
  }

  // Determine provider execution order
  const providerList: { name: string; fn: () => Promise<DiagnosisResult | null> }[] = [];
  if (preferredProvider === "opencode") {
    providerList.push({ name: "opencode", fn: tryOpenCode });
    providerList.push({ name: "gemini", fn: tryGemini });
    providerList.push({ name: "nvidia", fn: tryNvidia });
  } else if (preferredProvider === "nvidia") {
    providerList.push({ name: "nvidia", fn: tryNvidia });
    providerList.push({ name: "gemini", fn: tryGemini });
    providerList.push({ name: "opencode", fn: tryOpenCode });
  } else {
    // Default fallback order: Gemini -> NVIDIA -> OpenCode
    providerList.push({ name: "gemini", fn: tryGemini });
    providerList.push({ name: "nvidia", fn: tryNvidia });
    providerList.push({ name: "opencode", fn: tryOpenCode });
  }

  for (const p of providerList) {
    if (timeRemaining() <= 2000) break;
    const result = await p.fn();
    if (result) return result;
  }

  // ─── ALL PROVIDERS FAILED — Honest unavailable state ──────────────────────
  console.error(`[AI] All providers failed after ${Date.now() - startedAt}ms. Keys present: Gemini=${!!geminiKey}, NVIDIA=${!!nvidiaKey}, OpenCode=${!!openCodeKey}`);
  return {
    likely_stage: null,
    confidence: null,
    recommended_action: null,
    reasoning: null,
    evidence_used: [],
    assessment: null,
    provider: "AI_UNAVAILABLE",
    model: null,
    error: "No active AI provider returned a valid schema-compliant diagnosis. Autonomous loop safely halted with zero action.",
    latency_ms: Date.now() - startedAt,
  };
}
