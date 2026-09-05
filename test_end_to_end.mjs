import { diagnoseCase } from "./src/lib/ai/index.ts";

const mockEvidence = {
  gateway_status: "SUCCESS",
  gateway_rrn: "RRN_8849204820",
  settlement_status: "SUCCESS",
  webhook_status: "TIMEOUT",
  webhook_attempts: 3,
  merchant_ledger_status: "PENDING",
  amount_cents: 145000,
  currency: "INR",
  payment_method: "upi",
  case_state: "LIMBO",
  age_hours: 4.5,
};

console.log("=== RUNNING END-TO-END INVESTIGATION ENGINE ===");
const start = Date.now();
const res = await diagnoseCase(mockEvidence, { forceRealAI: true, timeoutMs: 25000 });
console.log("Result received in", Date.now() - start, "ms");
console.log("Provider:", res.provider);
console.log("Model:", res.model);
console.log("Confidence:", res.confidence);
console.log("Likely Stage:", res.likely_stage);
console.log("Recommended Action:", res.recommended_action);
console.log("Diagnosis:", res.diagnosis);
console.log("Uncertainty:", res.uncertainty);
console.log("Latency (reported):", res.latency_ms);
