#!/usr/bin/env node
// E2E test: Tests the actual AI provider stack used by the application.
// Run: node tests/e2e_ai_test.mjs

import { readFileSync } from "fs";
import { createHash } from "crypto";

// Load .env manually
const envFile = readFileSync(".env", "utf-8");
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  process.env[key] = value;
}

const SYSTEM_PROMPT = `You are the REFUND LOOP AI Payment Operations Diagnosis Engine.
Return ONLY strict JSON matching this schema:
{
  "likely_stage": "webhook_missing" | "bank_leg_stuck" | "invalid_destination" | "ledger_mismatch" | "ambiguous",
  "confidence": <number between 0.00 and 1.00>,
  "recommended_action": "resend_webhook" | "reconcile_state" | "refresh_status" | "verify_refund" | "escalate_to_human",
  "reasoning": "<1-2 sentence explanation>",
  "evidence_used": ["<signal 1>"]
}`;

const TEST_PROMPT = `${SYSTEM_PROMPT}

Evidence Details:
CASE: TXN_TEST_001
AMOUNT: ₹4,200
GATEWAY: ACKNOWLEDGED
BANK: CREDIT_CONFIRMED
WEBHOOK: FAILED_TIMEOUT
DESTINATION: VALID_ACTIVE
LEDGER: REFUNDED

The payment processor confirmed a credit but the merchant's webhook endpoint returned a timeout.`;

function healAndParseJson(raw) {
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/im, "");
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) cleaned = match[1];
  cleaned = cleaned.replace(/,\s*([\]\}])/g, "$1");
  return JSON.parse(cleaned);
}

const VALID_ACTIONS = ["resend_webhook", "reconcile_state", "refresh_status", "verify_refund", "escalate_to_human"];
const VALID_STAGES = ["webhook_missing", "bank_leg_stuck", "invalid_destination", "ledger_mismatch", "ambiguous"];

function validateSchema(obj) {
  const errors = [];
  if (!VALID_STAGES.includes(obj?.likely_stage)) errors.push(`invalid likely_stage: ${obj?.likely_stage}`);
  if (typeof obj?.confidence !== "number" || obj.confidence < 0 || obj.confidence > 1) errors.push(`invalid confidence: ${obj?.confidence}`);
  if (!VALID_ACTIONS.includes(obj?.recommended_action)) errors.push(`invalid recommended_action: ${obj?.recommended_action}`);
  if (typeof obj?.reasoning !== "string" || obj.reasoning.length < 5) errors.push(`invalid reasoning`);
  if (!Array.isArray(obj?.evidence_used)) errors.push(`missing evidence_used array`);
  return errors;
}

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { provider: "gemini", result: "SKIP", reason: "No GEMINI_API_KEY" };

  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: TEST_PROMPT }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return { provider: "gemini", result: "FAIL", reason: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { provider: "gemini", result: "FAIL", reason: "Empty content in response" };

    const parsed = healAndParseJson(raw);
    const errors = validateSchema(parsed);
    if (errors.length > 0) return { provider: "gemini", result: "FAIL", reason: `Schema errors: ${errors.join(", ")}`, raw };

    return {
      provider: "gemini",
      model: "gemini-3-flash-preview",
      result: "PASS",
      latency_ms: Date.now() - start,
      diagnosis: parsed,
    };
  } catch (err) {
    return { provider: "gemini", result: "FAIL", reason: err.message };
  }
}

async function testNvidianim() {
  const key = process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY;
  if (!key) return { provider: "nvidia", result: "SKIP", reason: "No NVIDIA_API_KEY / NIM_API_KEY" };

  const models = ["moonshotai/kimi-k3", "meta/llama-3.2-90b-vision-instruct"];
  for (const model of models) {
    const start = Date.now();
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are Yokai AI. Output strict JSON only." },
            { role: "user", content: TEST_PROMPT },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) continue;

      const parsed = healAndParseJson(raw);
      const errors = validateSchema(parsed);
      if (errors.length > 0) continue;

      return { provider: "nvidia", model, result: "PASS", latency_ms: Date.now() - start, diagnosis: parsed };
    } catch {
      continue;
    }
  }

  return { provider: "nvidia", result: "FAIL", reason: "NVIDIA models timed out or unreachable" };
}

async function testOpenCode() {
  const key = process.env.OPENCODE_API_KEY;
  if (!key) return { provider: "opencode", result: "SKIP", reason: "No OPENCODE_API_KEY" };

  const models = [
    "ling-3.0-flash-fin-free",
    "nemotron-3.5-lightning-free",
    "mimo-v2.5-free",
    "big-pickle",
    "hy3-free",
    "nemotron-3-ultra-free",
  ];

  for (const model of models) {
    const start = Date.now();
    try {
      const res = await fetch("https://opencode.ai/zen/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are Yokai AI document assistant. Return valid JSON only." },
            { role: "user", content: TEST_PROMPT },
          ],
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (!raw) continue;

      const parsed = healAndParseJson(raw);
      const errors = validateSchema(parsed);
      if (errors.length > 0) continue;

      return { provider: "opencode", model, result: "PASS", latency_ms: Date.now() - start, diagnosis: parsed };
    } catch {
      continue;
    }
  }

  return { provider: "opencode", result: "FAIL", reason: "All OpenCode models exhausted or rate-limited" };
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  REFUND LOOP — AI PROVIDER E2E TEST   ");
  console.log("═══════════════════════════════════════\n");

  const [gemini, nvidia, opencode] = await Promise.allSettled([
    testGemini(),
    testNvidianim(),
    testOpenCode(),
  ]);

  const results = [gemini, nvidia, opencode].map(r => r.status === "fulfilled" ? r.value : { result: "ERROR", reason: r.reason });

  for (const r of results) {
    const icon = r.result === "PASS" ? "✅" : r.result === "SKIP" ? "⏭️" : "❌";
    console.log(`${icon} ${(r.provider || "unknown").toUpperCase().padEnd(10)} ${r.result}`);
    if (r.model) console.log(`   model    : ${r.model}`);
    if (r.latency_ms) console.log(`   latency  : ${r.latency_ms}ms`);
    if (r.diagnosis) {
      console.log(`   stage    : ${r.diagnosis.likely_stage}`);
      console.log(`   confidence: ${(r.diagnosis.confidence * 100).toFixed(0)}%`);
      console.log(`   action   : ${r.diagnosis.recommended_action}`);
    }
    if (r.reason) console.log(`   reason   : ${r.reason}`);
    console.log();
  }

  const anyPassed = results.some(r => r.result === "PASS");
  console.log("─────────────────────────────────────────");
  console.log(`AI READY: ${anyPassed ? "YES ✅" : "NO ❌ — No provider returned a valid diagnosis"}`);
  console.log("─────────────────────────────────────────");

  process.exit(anyPassed ? 0 : 1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
