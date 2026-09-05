import { z } from "zod";
import { DiagnosisResult, EvidencePackage, RefundCase, AllowedAction } from "@/types";
import { formatEvidenceForPrompt } from "../agent/evidence-collector";
import { evaluateDeterministicDiagnosis } from "../agent/llm-provider";

export const DiagnosisSchema = z.object({
  likely_stage: z.enum([
    "webhook_missing",
    "bank_leg_stuck",
    "invalid_destination",
    "ledger_mismatch",
    "ambiguous",
  ]),
  confidence: z.number().min(0).max(1),
  recommended_action: z.enum([
    "resend_webhook",
    "retrigger_bank_leg",
    "correct_destination",
    "escalate_to_human",
  ]),
  reasoning: z.string(),
  evidence_used: z.array(z.string()).default([]),
});

export type DiagnosisPayload = z.infer<typeof DiagnosisSchema>;

export function healAndParseJson<T = any>(rawText: string): T {
  let cleaned = rawText.trim();
  // 1. Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/```\s*$/i, "");

  // 2. Extract first JSON block if surrounded by prose
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    cleaned = match[1];
  }

  // 3. Clean common LLM trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\]\}])/g, "$1");

  return JSON.parse(cleaned) as T;
}

const SYSTEM_PROMPT = `
You are Refund Loop's payment operations diagnosis engine. Analyze structured refund evidence. Return strict JSON matching the requested schema. Never invent evidence. If evidence is insufficient or contradictory, return low confidence and recommend escalation.

Required JSON Schema:
{
  "likely_stage": "webhook_missing" | "bank_leg_stuck" | "invalid_destination" | "ledger_mismatch" | "ambiguous",
  "confidence": number between 0.00 and 1.00,
  "recommended_action": "resend_webhook" | "retrigger_bank_leg" | "correct_destination" | "escalate_to_human",
  "reasoning": string,
  "evidence_used": string[]
}
`;

export async function runAIDiagnosis(
  refundCase: RefundCase,
  evidence: EvidencePackage,
  keyOverride?: { provider?: string; apiKey?: string }
): Promise<DiagnosisResult> {
  const prompt = formatEvidenceForPrompt(evidence, refundCase);

  const geminiKey = keyOverride?.provider === "gemini" && keyOverride.apiKey
    ? keyOverride.apiKey
    : process.env.GEMINI_API_KEY;

  const nvidiaKey = keyOverride?.provider === "nvidia" && keyOverride.apiKey
    ? keyOverride.apiKey
    : process.env.NVIDIA_API_KEY;

  const openCodeKey = keyOverride?.provider === "opencode" && keyOverride.apiKey
    ? keyOverride.apiKey
    : process.env.OPENCODE_API_KEY;

  // 1. NVIDIA NIM (meta/llama-3.2-90b-vision-instruct or llama-3.1-8b)
  if (nvidiaKey) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.2-90b-vision-instruct",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data?.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = healAndParseJson(rawContent);
          const validated = DiagnosisSchema.safeParse(parsed);
          if (validated.success) {
            return {
              ...validated.data,
              provider: "nvidia",
              raw_response: rawContent,
            };
          }
        }
      }
    } catch (e) {
      console.warn("NVIDIA NIM invocation failed, trying fallback:", e);
    }
  }

  // 2. OpenCode Zen (mimo-v2.5-free / muse-spark-1.2-contributor-free)
  if (openCodeKey) {
    try {
      const res = await fetch("https://opencode.ai/zen/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openCodeKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mimo-v2.5-free",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data?.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = healAndParseJson(rawContent);
          const validated = DiagnosisSchema.safeParse(parsed);
          if (validated.success) {
            return {
              ...validated.data,
              provider: "opencode",
              raw_response: rawContent,
            };
          }
        }
      }
    } catch (e) {
      console.warn("OpenCode Zen invocation failed, trying fallback:", e);
    }
  }

  // 3. Google Gemini (gemini-2.5-flash / gemini-3-flash)
  if (geminiKey) {
    const models = ["gemini-2.5-flash", "gemini-3-flash", "gemini-2.0-flash"];
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${SYSTEM_PROMPT}\n\nEvidence:\n${prompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawContent) {
            const parsed = healAndParseJson(rawContent);
            const validated = DiagnosisSchema.safeParse(parsed);
            if (validated.success) {
              return {
                ...validated.data,
                provider: "gemini",
                raw_response: rawContent,
              };
            }
          }
        }
      } catch (e) {
        // try next
        continue;
      }
    }
  }

  // 4. Local Diagnostic Fallback (Explicitly labeled, NEVER mislabeled as AI)
  const local = evaluateDeterministicDiagnosis(refundCase, evidence);
  return {
    likely_stage: local.likely_stage,
    confidence: local.confidence,
    recommended_action: local.recommended_action as AllowedAction,
    reasoning: local.reasoning,
    evidence_used: [
      `Gateway: ${evidence.gateway_status}`,
      `Bank: ${evidence.bank_status}`,
      `Webhook: ${evidence.webhook_status}`,
      `Destination: ${evidence.destination_status}`,
    ],
    provider: "local_fallback",
  };
}
