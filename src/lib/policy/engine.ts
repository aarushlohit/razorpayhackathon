import type { DiagnosisResult, PolicyDecision, RefundCase, SimulatorConfig, AllowedAction } from "../../types/index";

const VALID_ALLOWED_ACTIONS: AllowedAction[] = [
  "resend_webhook",
  "reconcile_state",
  "refresh_status",
  "verify_refund",
  "escalate_to_human",
];

export function evaluatePolicy(
  refundCase: RefundCase,
  diagnosis: DiagnosisResult,
  config: SimulatorConfig
): PolicyDecision {
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

  // Rule 10: Incomplete evidence
  if (!checks.evidence_complete_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_10_MISSING_EVIDENCE",
      reason: "Missing or incomplete system telemetry evidence required for deterministic safety validation.",
      checks,
    };
  }

  // Rule 9: Unsupported action
  if (!checks.allowed_action_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_9_UNSUPPORTED_ACTION",
      reason: `Action '${diagnosis.recommended_action}' is not in the authorized remediation allowlist.`,
      checks,
    };
  }

  // Rule 3: Maximum one automatic remediation attempt per case (no infinite retry loops)
  if (!checks.remediation_limit_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_3_MAX_REMEDIATION_LIMIT",
      reason: `Case has already undergone ${refundCase.remediation_attempts} remediation attempt(s). Autonomous retry limit reached.`,
      checks,
    };
  }

  // Rule 2: Amount exceeds high-value threshold -> Human approval required
  if (!checks.amount_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_2_HIGH_VALUE_THRESHOLD",
      reason: `Refund amount ₹${refundCase.amount.toLocaleString("en-IN")} exceeds autonomous limit of ₹${highValueThreshold.toLocaleString("en-IN")}. Mandatory human authorization required.`,
      checks,
    };
  }

  // Rule 1: Confidence below threshold -> Escalate to human
  if (!checks.confidence_passed) {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_1_LOW_CONFIDENCE",
      reason: `Model confidence (${(diagnosis.confidence * 100).toFixed(0)}%) is below strict safety cutoff (${(confidenceThreshold * 100).toFixed(0)}%). Evidence is ambiguous or contradictory.`,
      checks,
    };
  }

  // If action recommended was explicitly escalate_to_human
  if (diagnosis.recommended_action === "escalate_to_human") {
    return {
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "DIAGNOSIS_RECOMMENDED_ESCALATION",
      reason: `Diagnosis determined stage requires manual operational handling: ${diagnosis.reasoning}`,
      checks,
    };
  }

  // All policy rules passed! Safe bounded autonomous action approved
  return {
    allowed: true,
    action_to_take: diagnosis.recommended_action,
    rule_triggered: "POLICY_CHECKS_PASSED",
    reason: `All deterministic policy rules passed. Confidence ${(diagnosis.confidence * 100).toFixed(0)}% >= ${(confidenceThreshold * 100).toFixed(0)}%, Amount ₹${refundCase.amount.toLocaleString("en-IN")} <= ₹${highValueThreshold.toLocaleString("en-IN")}.`,
    checks,
  };
}
