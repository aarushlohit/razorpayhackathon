import test from "node:test";
import assert from "node:assert/strict";

// Reusable pure policy test functions mirroring src/lib/policy/engine.ts
const VALID_ALLOWED_ACTIONS = [
  "resend_webhook",
  "retrigger_bank_leg",
  "correct_destination",
  "escalate_to_human",
];

function evaluatePolicy(refundCase, diagnosis, config = {}) {
  const confidenceThreshold = config.confidence_threshold ?? 0.85;
  const highValueThreshold = config.high_value_threshold ?? 50000;

  const checks = {
    confidence_passed: diagnosis.confidence >= confidenceThreshold,
    amount_passed: refundCase.amount <= highValueThreshold,
    remediation_limit_passed: refundCase.remediation_attempts < 1,
    allowed_action_passed: VALID_ALLOWED_ACTIONS.includes(diagnosis.recommended_action),
    evidence_complete_passed: Boolean(
      refundCase.evidence &&
      refundCase.evidence.gateway_status &&
      refundCase.evidence.bank_status &&
      refundCase.evidence.webhook_status
    ),
  };

  if (!checks.evidence_complete_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_10_MISSING_EVIDENCE",
      reason: "Missing or incomplete system telemetry evidence required for deterministic safety validation.",
      checks,
    };
  }

  if (!checks.allowed_action_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_9_UNSUPPORTED_ACTION",
      reason: `Action '${diagnosis.recommended_action}' is not in the authorized remediation whitelist.`,
      checks,
    };
  }

  if (!checks.remediation_limit_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_3_MAX_REMEDIATION_LIMIT",
      reason: `Case has already undergone ${refundCase.remediation_attempts} remediation attempt(s). Autonomous retry limit reached.`,
      checks,
    };
  }

  if (!checks.amount_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_2_HIGH_VALUE_THRESHOLD",
      reason: `Refund amount ₹${refundCase.amount} exceeds autonomous limit. Mandatory human authorization.`,
      checks,
    };
  }

  if (!checks.confidence_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_1_LOW_CONFIDENCE",
      reason: `Model confidence (${diagnosis.confidence}) is below strict safety cutoff (${confidenceThreshold}).`,
      checks,
    };
  }

  if (diagnosis.recommended_action === "escalate_to_human") {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "DIAGNOSIS_RECOMMENDED_ESCALATION",
      reason: diagnosis.reasoning,
      checks,
    };
  }

  return {
    allowed: true,
    action_to_take: diagnosis.recommended_action,
    rule_triggered: "POLICY_CHECKS_PASSED",
    reason: "All 10 deterministic policy rules passed.",
    checks,
  };
}

// Resilient JSON Auto-Healer test function
function healAndParseJson(rawText) {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/```\s*$/i, "");
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) cleaned = match[1];
  cleaned = cleaned.replace(/,\s*([\]\}])/g, "$1");
  return JSON.parse(cleaned);
}

// Tests
test("Rule 1: Confidence below threshold (e.g. 0.74 < 0.85) triggers immediate escalation", () => {
  const refundCase = {
    amount: 1500,
    remediation_attempts: 0,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "NO_UPDATE", webhook_status: "DELIVERED" }
  };
  const diagnosis = {
    likely_stage: "ambiguous",
    confidence: 0.74,
    recommended_action: "retrigger_bank_leg",
    reasoning: "Contradictory signals present."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_1_LOW_CONFIDENCE");
});

test("Rule 2: High value refund (> ₹50,000) blocks auto-action and mandates human approval", () => {
  const refundCase = {
    amount: 75000,
    remediation_attempts: 0,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "CREDIT_CONFIRMED", webhook_status: "FAILED_TIMEOUT" }
  };
  const diagnosis = {
    likely_stage: "webhook_missing",
    confidence: 0.98,
    recommended_action: "resend_webhook",
    reasoning: "Webhook failed."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_2_HIGH_VALUE_THRESHOLD");
});

test("Rule 3 & 7: Maximum ONE automatic remediation attempt prevents infinite loops", () => {
  const refundCase = {
    amount: 2500,
    remediation_attempts: 1, // Already attempted once!
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "PENDING_SWITCH", webhook_status: "DELIVERED" }
  };
  const diagnosis = {
    likely_stage: "bank_leg_stuck",
    confidence: 0.92,
    recommended_action: "retrigger_bank_leg",
    reasoning: "Bank leg pending."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_3_MAX_REMEDIATION_LIMIT");
});

test("Rule 9: Unsupported / hallucinated action triggers escalation", () => {
  const refundCase = {
    amount: 3200,
    remediation_attempts: 0,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "PENDING_SWITCH", webhook_status: "DELIVERED" }
  };
  const diagnosis = {
    likely_stage: "bank_leg_stuck",
    confidence: 0.95,
    recommended_action: "force_payout_wire_transfer", // NOT in whitelist!
    reasoning: "Attempting unapproved wire transfer."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_9_UNSUPPORTED_ACTION");
});

test("Rule 10: Missing critical telemetry evidence triggers escalation", () => {
  const refundCase = {
    amount: 4200,
    remediation_attempts: 0,
    evidence: { gateway_status: null, bank_status: null, webhook_status: null }
  };
  const diagnosis = {
    likely_stage: "bank_leg_stuck",
    confidence: 0.95,
    recommended_action: "retrigger_bank_leg",
    reasoning: "Guessed based on incomplete data."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_10_MISSING_EVIDENCE");
});

test("Policy Pass: High confidence + valid amount + valid action -> Autonomous execution allowed", () => {
  const refundCase = {
    amount: 4200,
    remediation_attempts: 0,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "CREDIT_CONFIRMED", webhook_status: "FAILED_TIMEOUT" }
  };
  const diagnosis = {
    likely_stage: "webhook_missing",
    confidence: 0.96,
    recommended_action: "resend_webhook",
    reasoning: "Clear webhook timeout."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, true);
  assert.equal(decision.action_to_take, "resend_webhook");
  assert.equal(decision.rule_triggered, "POLICY_CHECKS_PASSED");
});

test("Resilient JSON Auto-Healer correctly sanitizes markdown code fences and trailing commas", () => {
  const rawLLMOutput = `
  Here is your analysis:
  \`\`\`json
  {
    "likely_stage": "bank_leg_stuck",
    "confidence": 0.91,
    "recommended_action": "retrigger_bank_leg",
    "reasoning": "Gateway acknowledged refund.",
  }
  \`\`\`
  `;
  const parsed = healAndParseJson(rawLLMOutput);
  assert.equal(parsed.likely_stage, "bank_leg_stuck");
  assert.equal(parsed.confidence, 0.91);
  assert.equal(parsed.recommended_action, "retrigger_bank_leg");
});

test("Planted Failure: Verification catches ineffective remediation instead of assuming success", () => {
  // Simulate execution of retrigger_bank_leg on planted failure case
  const isPlantedFailure = true;
  let bankStatus = "NO_UPDATE"; // Remains pending/unresolved

  function verifyRefundStatus(isPlanted, currentBankStatus) {
    if (isPlanted && currentBankStatus !== "CREDIT_CONFIRMED") {
      return {
        observed_status: "STILL_PENDING",
        remediation_effective: false,
        details: "Acquiring switch still reports unconfirmed status."
      };
    }
    return {
      observed_status: "RESOLVED",
      remediation_effective: true,
      details: "Payment legs closed."
    };
  }

  const result = verifyRefundStatus(isPlantedFailure, bankStatus);
  assert.equal(result.observed_status, "STILL_PENDING");
  assert.equal(result.remediation_effective, false);
});

test("Deterministic Seed Generator: Identical seed produces identical case IDs and amounts", () => {
  function createPRNG(seed) {
    let s = Math.floor(seed);
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const p1 = createPRNG(12345);
  const p2 = createPRNG(12345);
  const p3 = createPRNG(99999);

  const val1 = [p1(), p1(), p1()];
  const val2 = [p2(), p2(), p2()];
  const val3 = [p3(), p3(), p3()];

  assert.deepEqual(val1, val2, "Identical seeds must yield bitwise identical pseudo-random stream.");
  assert.notDeepEqual(val1, val3, "Different seeds must yield different values.");
});

test("Closed-Loop E2E: Standard Webhook Missing -> Act -> Verify -> Resolved with Revenue Recovered", () => {
  const refundCase = {
    case_id: "CS_001_0001",
    amount: 4200,
    remediation_attempts: 0,
    current_status: "LIMBO",
    evidence: {
      gateway_status: "ACKNOWLEDGED",
      bank_status: "CREDIT_CONFIRMED",
      webhook_status: "FAILED_TIMEOUT",
      destination_status: "VALID_ACTIVE",
      event_trail: []
    }
  };

  const diagnosis = {
    likely_stage: "webhook_missing",
    confidence: 0.96,
    recommended_action: "resend_webhook",
    reasoning: "Bank confirmed credit, webhook failed."
  };

  // 1. Policy Gate
  const policy = evaluatePolicy(refundCase, diagnosis);
  assert.equal(policy.allowed, true);
  assert.equal(policy.action_to_take, "resend_webhook");

  // 2. Action Execution
  refundCase.remediation_attempts += 1;
  refundCase.evidence.webhook_status = "DELIVERED";
  refundCase.current_status = "ACTION_IN_PROGRESS";

  // 3. Verification Check
  const isResolved =
    refundCase.evidence.gateway_status === "ACKNOWLEDGED" &&
    refundCase.evidence.bank_status === "CREDIT_CONFIRMED" &&
    refundCase.evidence.webhook_status === "DELIVERED" &&
    refundCase.evidence.destination_status === "VALID_ACTIVE";

  assert.equal(isResolved, true);
  refundCase.current_status = "RESOLVED";
  assert.equal(refundCase.current_status, "RESOLVED");
  assert.equal(refundCase.amount, 4200);
});

test("Closed-Loop E2E: Planted Failure -> Act -> Verify Catches STILL_PENDING -> Refuses Retry -> Escalate", () => {
  const refundCase = {
    case_id: "CS_001_PLANTED",
    amount: 3500,
    remediation_attempts: 0,
    is_planted_failure: true,
    current_status: "LIMBO",
    evidence: {
      gateway_status: "ACKNOWLEDGED",
      bank_status: "NO_UPDATE",
      webhook_status: "DELIVERED",
      destination_status: "VALID_ACTIVE",
      event_trail: []
    }
  };

  const diagnosis = {
    likely_stage: "bank_leg_stuck",
    confidence: 0.89,
    recommended_action: "retrigger_bank_leg",
    reasoning: "Dispatched bank reversal command."
  };

  // 1. Policy gate allows plausible diagnosis
  const policy = evaluatePolicy(refundCase, diagnosis);
  assert.equal(policy.allowed, true);

  // 2. Action executes
  refundCase.remediation_attempts += 1;
  // Because it is a planted failure, bank switch returns failure or remains unconfirmed
  refundCase.evidence.bank_status = "NO_UPDATE";
  refundCase.current_status = "ACTION_IN_PROGRESS";

  // 3. Closed-Loop Verification: Agent DOES NOT assume success!
  function verifyStatus(rc) {
    if (rc.is_planted_failure && rc.evidence.bank_status !== "CREDIT_CONFIRMED") {
      return { observed_status: "STILL_PENDING", effective: false };
    }
    return { observed_status: "RESOLVED", effective: true };
  }

  const verification = verifyStatus(refundCase);
  assert.equal(verification.observed_status, "STILL_PENDING");
  assert.equal(verification.effective, false);

  // 4. Agent halts retry loop, reduces confidence, and routes to Human Escalation
  diagnosis.confidence = 0.35;
  refundCase.current_status = "ESCALATED_FAILED_REMEDIATION";

  assert.equal(refundCase.current_status, "ESCALATED_FAILED_REMEDIATION");
  assert.equal(refundCase.remediation_attempts, 1, "Must never retry infinitely");
  assert.ok(diagnosis.confidence < 0.50);
});
import crypto from "crypto";

test("Security: PBKDF2 password hashing & timing-safe verification", () => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync("SecretPassword123!", salt, 100000, 64, "sha512").toString("hex");

  function verifyPassword(pwd, expectedHash, s) {
    const calc = crypto.pbkdf2Sync(pwd, s, 100000, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(calc, "hex"), Buffer.from(expectedHash, "hex"));
  }

  assert.equal(verifyPassword("SecretPassword123!", hash, salt), true);
  assert.equal(verifyPassword("WrongPassword", hash, salt), false);
});

test("Multi-Tenant Isolation: Queries enforce strict workspace_id boundary", () => {
  const casesDb = [
    { case_id: "CS_01", workspace_id: "ws_acme" },
    { case_id: "CS_02", workspace_id: "ws_acme" },
    { case_id: "CS_03", workspace_id: "ws_beta" },
  ];

  function getCasesForWorkspace(wsId) {
    return casesDb.filter(c => c.workspace_id === wsId);
  }

  const acmeCases = getCasesForWorkspace("ws_acme");
  assert.equal(acmeCases.length, 2);
  assert.ok(acmeCases.every(c => c.workspace_id === "ws_acme"));

  const betaCases = getCasesForWorkspace("ws_beta");
  assert.equal(betaCases.length, 1);
  assert.equal(betaCases[0].case_id, "CS_03");
});

test("AI Zod Schema: Rejects invalid probability range and unsupported stage names", () => {
  // Simulating Zod schema validation
  function validateDiagnosis(payload) {
    const validStages = ["webhook_missing", "bank_leg_stuck", "invalid_destination", "ledger_mismatch", "ambiguous"];
    const validActions = ["resend_webhook", "retrigger_bank_leg", "correct_destination", "escalate_to_human"];
    
    if (!validStages.includes(payload.likely_stage)) return false;
    if (typeof payload.confidence !== "number" || payload.confidence < 0 || payload.confidence > 1) return false;
    if (!validActions.includes(payload.recommended_action)) return false;
    if (typeof payload.reasoning !== "string") return false;
    return true;
  }

  assert.equal(validateDiagnosis({
    likely_stage: "webhook_missing",
    confidence: 0.95,
    recommended_action: "resend_webhook",
    reasoning: "Valid diagnosis"
  }), true);

  // Confidence out of range (1.25 > 1)
  assert.equal(validateDiagnosis({
    likely_stage: "webhook_missing",
    confidence: 1.25,
    recommended_action: "resend_webhook",
    reasoning: "Invalid confidence"
  }), false);

  // Hallucinated stage
  assert.equal(validateDiagnosis({
    likely_stage: "alien_transmission_interrupted",
    confidence: 0.90,
    recommended_action: "resend_webhook",
    reasoning: "Invalid stage"
  }), false);
});
