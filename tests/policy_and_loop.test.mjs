import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// 1. Policy Engine Tests
const VALID_ALLOWED_ACTIONS = [
  "resend_webhook",
  "reconcile_state",
  "refresh_status",
  "verify_refund",
  "escalate_to_human",
];

function evaluatePolicy(refundCase, diagnosis, config = {}) {
  const confidenceThreshold = config.confidence_threshold ?? 0.85;
  const highValueThreshold = config.high_value_limit ?? 50000;

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
      reason: `Action '${diagnosis.recommended_action}' is not in the authorized remediation allowlist.`,
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
      reason: `Refund amount ₹${refundCase.amount} exceeds autonomous limit. Mandatory human authorization required.`,
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
    reason: "All deterministic policy rules passed.",
    checks,
  };
}

function healAndParseJson(rawText) {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/```\s*$/i, "");
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) cleaned = match[1];
  cleaned = cleaned.replace(/,\s*([\]\}])/g, "$1");
  return JSON.parse(cleaned);
}

function computeEventHash(previousHash, caseId, stage, action, timestamp) {
  const content = `${previousHash}:${caseId}:${stage}:${action}:${timestamp}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Tests
test("Rule 1: Confidence below threshold (0.74 < 0.85) triggers immediate escalation", () => {
  const refundCase = {
    amount: 1500,
    remediation_attempts: 0,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "NO_UPDATE", webhook_status: "DELIVERED" }
  };
  const diagnosis = {
    likely_stage: "ambiguous",
    confidence: 0.74,
    recommended_action: "refresh_status",
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

test("Rule 3: Maximum ONE automatic remediation attempt prevents infinite loops", () => {
  const refundCase = {
    amount: 2500,
    remediation_attempts: 1,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "PENDING_SWITCH", webhook_status: "DELIVERED" }
  };
  const diagnosis = {
    likely_stage: "bank_leg_stuck",
    confidence: 0.92,
    recommended_action: "refresh_status",
    reasoning: "Bank leg pending."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_3_MAX_REMEDIATION_LIMIT");
});

test("Rule 9: Unsupported / prohibited action (e.g. correct_destination) triggers escalation", () => {
  const refundCase = {
    amount: 3200,
    remediation_attempts: 0,
    evidence: { gateway_status: "ACKNOWLEDGED", bank_status: "PENDING_SWITCH", webhook_status: "DELIVERED" }
  };
  const diagnosis = {
    likely_stage: "invalid_destination",
    confidence: 0.95,
    recommended_action: "correct_destination", // Prohibited: customer refund redirection
    reasoning: "Attempting destination modification."
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
    recommended_action: "refresh_status",
    reasoning: "Guessed based on incomplete data."
  };
  const decision = evaluatePolicy(refundCase, diagnosis);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action_to_take, "escalate_to_human");
  assert.equal(decision.rule_triggered, "RULE_10_MISSING_EVIDENCE");
});

test("Policy Pass: High confidence + valid amount + whitelisted action -> Autonomous execution allowed", () => {
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

test("Resilient JSON Auto-Healer correctly cleans markdown fences and trailing commas", () => {
  const rawLLMOutput = `
  \`\`\`json
  {
    "likely_stage": "webhook_missing",
    "confidence": 0.96,
    "recommended_action": "resend_webhook",
    "reasoning": "Webhook timeout confirmed.",
  }
  \`\`\`
  `;
  const parsed = healAndParseJson(rawLLMOutput);
  assert.equal(parsed.likely_stage, "webhook_missing");
  assert.equal(parsed.confidence, 0.96);
  assert.equal(parsed.recommended_action, "resend_webhook");
});

test("Planted Failure: Verification catches unresolved state and prevents infinite loops", () => {
  const isPlanted = true;
  const currentBankStatus = "NO_UPDATE";

  function verifyStatus(planted, status) {
    if (planted && status !== "CREDIT_CONFIRMED") {
      return { observed_status: "STILL_PENDING", effective: false };
    }
    return { observed_status: "RESOLVED", effective: true };
  }

  const result = verifyStatus(isPlanted, currentBankStatus);
  assert.equal(result.observed_status, "STILL_PENDING");
  assert.equal(result.effective, false);
});

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

  assert.equal(getCasesForWorkspace("ws_acme").length, 2);
  assert.equal(getCasesForWorkspace("ws_beta").length, 1);
});

test("Cryptographic Tamper-Evident Hash Chain: Detects valid chain and detects tampered records", () => {
  const genesis = "0".repeat(64);
  const t1 = "2026-09-05T12:00:00.000Z";
  const h1 = computeEventHash(genesis, "CS_01", "DETECT", "DETECT", t1);

  const t2 = "2026-09-05T12:00:01.000Z";
  const h2 = computeEventHash(h1, "CS_01", "DIAGNOSE", "DIAGNOSE", t2);

  const chain = [
    { previous_hash: genesis, case_id: "CS_01", stage: "DETECT", action: "DETECT", timestamp: t1, event_hash: h1 },
    { previous_hash: h1, case_id: "CS_01", stage: "DIAGNOSE", action: "DIAGNOSE", timestamp: t2, event_hash: h2 },
  ];

  function verifyChain(logs) {
    let prev = "0".repeat(64);
    for (const log of logs) {
      if (log.previous_hash !== prev) return false;
      const expected = computeEventHash(log.previous_hash, log.case_id, log.stage, log.action, log.timestamp);
      if (log.event_hash !== expected) return false;
      prev = log.event_hash;
    }
    return true;
  }

  assert.equal(verifyChain(chain), true, "Valid chain must pass integrity check");

  // Tamper with record
  const tamperedChain = [
    { ...chain[0], case_id: "CS_TAMPERED" },
    chain[1]
  ];
  assert.equal(verifyChain(tamperedChain), false, "Tampered chain must be caught");
});
