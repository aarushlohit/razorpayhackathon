import crypto from "crypto";
import type {
  DiagnosisResult,
  PolicyDecision,
  RefundCase,
  AllowedAction,
  PolicyRuleEvaluation,
  PolicyEvaluationRecord,
  Workspace,
} from "@/types";
import { Database } from "../db";

/**
 * Server-side allowlist of safe automated remediation tools.
 * Prohibits arbitrary method execution or browser-supplied action names.
 */
export const AUTHORIZED_TOOLS: readonly AllowedAction[] = Object.freeze([
  "resend_webhook",
  "refresh_status",
  "reconcile_state",
  "verify_refund",
  "escalate_to_human",
]);

/**
 * Valid case states that are eligible for autonomous investigation and remediation.
 * Terminal or already escalated cases CANNOT be executed.
 */
export const ELIGIBLE_CASE_STATES = Object.freeze([
  "LIMBO",
  "INVESTIGATING",
]);

/**
 * Permissible mappings between AI diagnosed failure classification and remediation action.
 * A diagnosis of DESTINATION_ISSUE or BANK_LEG_STUCK cannot execute resend_webhook.
 */
export const DIAGNOSIS_ACTION_COMPATIBILITY: Record<string, AllowedAction[]> = Object.freeze({
  webhook_missing: ["resend_webhook", "escalate_to_human"],
  WEBHOOK_DELIVERY_FAILURE: ["resend_webhook", "escalate_to_human"],
  bank_leg_stuck: ["refresh_status", "verify_refund", "escalate_to_human"],
  BANK_LEG_STALLED: ["refresh_status", "verify_refund", "escalate_to_human"],
  invalid_destination: ["escalate_to_human"], // Never attempt automated remediation for bad destination accounts
  INVALID_DESTINATION: ["escalate_to_human"],
  ledger_mismatch: ["reconcile_state", "escalate_to_human"],
  LEDGER_DESYNCHRONIZATION: ["reconcile_state", "escalate_to_human"],
  ambiguous: ["escalate_to_human"],
  INCOMPLETE_TELEMETRY: ["escalate_to_human"],
});

export interface PolicyEvaluationInput {
  caseData: RefundCase;
  diagnosis: DiagnosisResult;
  requestedAction?: AllowedAction;
  workspace: Workspace;
}

/**
 * Agentic Server-Side Policy Engine.
 * 
 * Enforces rigid, non-bypassable guardrails before any action
 * taken by the agent. Zero frontend or LLM authority.
 */
export function evaluateSecurityPolicy({
  caseData,
  diagnosis,
  requestedAction,
  workspace,
}: PolicyEvaluationInput): PolicyDecision {
  const evaluatedAt = new Date().toISOString();
  const evaluationId = `eval_${crypto.randomUUID()}`;

  const action = requestedAction || diagnosis.recommended_action;
  const confidenceCutoff = workspace.confidence_threshold ?? 0.85;
  const highValueCutoff = workspace.high_value_limit ?? 50000;

  const rules: PolicyRuleEvaluation[] = [];

  // ─── RULE 01 — AI CONFIDENCE ──────────────────────────────────────────────
  const rule01Passed = diagnosis.confidence >= confidenceCutoff;
  rules.push({
    id: "RULE_01_CONFIDENCE",
    name: "AI Confidence Threshold",
    passed: rule01Passed,
    observed: `${(diagnosis.confidence * 100).toFixed(1)}%`,
    threshold: `≥ ${(confidenceCutoff * 100).toFixed(0)}%`,
    reason: rule01Passed
      ? `AI confidence (${(diagnosis.confidence * 100).toFixed(1)}%) meets calibrated cutoff (≥ ${(confidenceCutoff * 100).toFixed(0)}%).`
      : `AI confidence (${(diagnosis.confidence * 100).toFixed(1)}%) is below required safety threshold (${(confidenceCutoff * 100).toFixed(0)}%). Probabilistic uncertainty requires human review.`,
  });

  // ─── RULE 02 — HIGH VALUE CEILING ─────────────────────────────────────────
  const rule02Passed = caseData.amount <= highValueCutoff;
  rules.push({
    id: "RULE_02_HIGH_VALUE",
    name: "High Value Liability Ceiling",
    passed: rule02Passed,
    observed: `₹${caseData.amount.toLocaleString("en-IN")}`,
    threshold: `≤ ₹${highValueCutoff.toLocaleString("en-IN")}`,
    reason: rule02Passed
      ? `Refund liability ₹${caseData.amount.toLocaleString("en-IN")} is within autonomous ceiling (≤ ₹${highValueCutoff.toLocaleString("en-IN")}).`
      : `Refund liability ₹${caseData.amount.toLocaleString("en-IN")} exceeds autonomous limit of ₹${highValueCutoff.toLocaleString("en-IN")}. Mandatory human approval required regardless of AI confidence.`,
  });

  // ─── RULE 03 — ACTION ALLOWLIST ───────────────────────────────────────────
  const rule03Passed = AUTHORIZED_TOOLS.includes(action as AllowedAction);
  rules.push({
    id: "RULE_03_ACTION_ALLOWLIST",
    name: "Server Action Allowlist",
    passed: rule03Passed,
    observed: String(action),
    threshold: AUTHORIZED_TOOLS.join(", "),
    reason: rule03Passed
      ? `Action '${action}' is registered in server-side allowlist.`
      : `Action '${action}' is NOT an authorized remediation tool. Bounded server prevents unknown execution.`,
  });

  // ─── RULE 04 — DIAGNOSIS/ACTION COMPATIBILITY ────────────────────────────
  const stageKey = diagnosis.assessment?.primary_hypothesis?.code || diagnosis.likely_stage;
  const compatibleActions = DIAGNOSIS_ACTION_COMPATIBILITY[stageKey] || DIAGNOSIS_ACTION_COMPATIBILITY[diagnosis.likely_stage] || ["escalate_to_human"];
  const rule04Passed = compatibleActions.includes(action);
  rules.push({
    id: "RULE_04_ACTION_COMPATIBILITY",
    name: "Diagnosis / Action Compatibility",
    passed: rule04Passed,
    observed: `${stageKey} -> ${action}`,
    threshold: compatibleActions.join(", "),
    reason: rule04Passed
      ? `Remediation action '${action}' is logically compatible with verified failure stage '${stageKey}'.`
      : `Action '${action}' is INCOMPATIBLE with failure diagnosis '${stageKey}'. Allowed: [${compatibleActions.join(", ")}].`,
  });

  // ─── RULE 05 — CASE STATE ELIGIBILITY ─────────────────────────────────────
  const rule05Passed = ELIGIBLE_CASE_STATES.includes(caseData.current_status as any);
  rules.push({
    id: "RULE_05_CASE_STATE",
    name: "Case State Eligibility",
    passed: rule05Passed,
    observed: caseData.current_status,
    threshold: ELIGIBLE_CASE_STATES.join(", "),
    reason: rule05Passed
      ? `Case status '${caseData.current_status}' is in eligible processing state.`
      : `Case status '${caseData.current_status}' is not eligible for autonomous remediation (terminal or already escalated).`,
  });

  // ─── RULE 06 — IDEMPOTENCY / MAX REMEDIATIONS ─────────────────────────────
  const maxAttempts = workspace.max_attempts ?? 1;
  const rule06Passed = caseData.remediation_attempts < maxAttempts;
  rules.push({
    id: "RULE_06_IDEMPOTENCY",
    name: "Idempotency & Remediation Limit",
    passed: rule06Passed,
    observed: `${caseData.remediation_attempts} attempts`,
    threshold: `< ${maxAttempts} attempt(s)`,
    reason: rule06Passed
      ? `Case has undergone 0 previous autonomous remediations. Safe to attempt single idempotent execution.`
      : `Case has already undergone ${caseData.remediation_attempts} remediation attempt(s). Further execution blocked to prevent infinite loops.`,
  });

  // ─── RULE 07 — WORKSPACE ISOLATION ────────────────────────────────────────
  const rule07Passed = caseData.workspace_id === workspace.id;
  rules.push({
    id: "RULE_07_WORKSPACE_ISOLATION",
    name: "Workspace Multi-Tenant Isolation",
    passed: rule07Passed,
    observed: `Case: ${caseData.workspace_id} vs Session: ${workspace.id}`,
    threshold: `Strict Match: ${workspace.id}`,
    reason: rule07Passed
      ? `Case workspace strictly matches authenticated session workspace '${workspace.id}'.`
      : `SECURITY VIOLATION: Case workspace (${caseData.workspace_id}) does not match session (${workspace.id}). Cross-tenant access blocked.`,
  });

  // ─── RULE 08 — PROVIDER & TELEMETRY FRESHNESS ─────────────────────────────
  const hasTelemetry = Boolean(
    caseData.evidence &&
    caseData.evidence.gateway_status &&
    caseData.evidence.bank_status &&
    caseData.evidence.webhook_status
  );
  // If downstream state already shows delivered/resolved, stale diagnosis must be halted
  const isStale = caseData.evidence?.webhook_status === "DELIVERED" && action === "resend_webhook";
  const rule08Passed = hasTelemetry && !isStale;
  rules.push({
    id: "RULE_08_PROVIDER_STATE",
    name: "Provider Telemetry Freshness",
    passed: rule08Passed,
    observed: hasTelemetry ? (isStale ? "STALE (webhook already DELIVERED)" : "FRESH") : "INCOMPLETE",
    threshold: "Complete & Non-Stale Telemetry",
    reason: rule08Passed
      ? `Provider telemetry is complete and matches live evidence state.`
      : (isStale
          ? `Authorization invalidated: Webhook is already DELIVERED in provider telemetry. Fresh investigation required.`
          : `Incomplete provider telemetry across payment subsystems.`),
  });

  // ─── RULE 09 — APPROVED TOOL INTEGRITY ────────────────────────────────────
  const rule09Passed = action !== "escalate_to_human" ? AUTHORIZED_TOOLS.includes(action) : true;
  rules.push({
    id: "RULE_09_APPROVED_TOOL",
    name: "Approved Execution Tooling",
    passed: rule09Passed,
    observed: action,
    threshold: "Server-controlled handler implementation",
    reason: rule09Passed
      ? `Tool '${action}' maps to a verified server-controlled adapter method.`
      : `Tool '${action}' has no approved handler. Dynamic execution rejected.`,
  });

  // ─── RULE 10 — EXPLICIT ESCALATION INTENT ─────────────────────────────────
  const isExplicitEscalation = action === "escalate_to_human";
  const rule10Passed = !isExplicitEscalation;
  rules.push({
    id: "RULE_10_ESCALATION_CHECK",
    name: "Autonomous Action vs Escalation",
    passed: rule10Passed,
    observed: action,
    threshold: "Action != escalate_to_human",
    reason: isExplicitEscalation
      ? `AI diagnosis or operations policy explicitly recommended human escalation.`
      : `Autonomous remediation action '${action}' requested.`,
  });

  // ─── AGGREGATE POLICY VERDICT ─────────────────────────────────────────────
  // If Rule 07 fails (cross workspace), it is a severe halt
  if (!rule07Passed) {
    const dec: PolicyDecision = {
      evaluation_id: evaluationId,
      decision: "HALT",
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_07_WORKSPACE_ISOLATION",
      reason: rules.find((r) => r.id === "RULE_07_WORKSPACE_ISOLATION")!.reason,
      evaluated_at: evaluatedAt,
      rules,
      checks: {
        confidence_passed: rule01Passed,
        amount_passed: rule02Passed,
        remediation_limit_passed: rule06Passed,
        allowed_action_passed: rule03Passed,
        evidence_complete_passed: hasTelemetry,
        action_compatibility_passed: rule04Passed,
        case_state_passed: rule05Passed,
        workspace_isolation_passed: rule07Passed,
        provider_state_passed: rule08Passed,
        approved_tool_passed: rule09Passed,
      },
    };
    persistEvaluation(dec, caseData, workspace.id, action);
    return dec;
  }

  // If High Value fails, it triggers HUMAN_REVIEW
  if (!rule02Passed) {
    const dec: PolicyDecision = {
      evaluation_id: evaluationId,
      decision: "HUMAN_REVIEW",
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: "RULE_02_HIGH_VALUE",
      reason: `Rule 2 blocked autonomous execution because refund liability ₹${caseData.amount.toLocaleString("en-IN")} exceeds the autonomous limit of ₹${highValueCutoff.toLocaleString("en-IN")}. Mandatory human ops authorization required.`,
      evaluated_at: evaluatedAt,
      rules,
      checks: {
        confidence_passed: rule01Passed,
        amount_passed: rule02Passed,
        remediation_limit_passed: rule06Passed,
        allowed_action_passed: rule03Passed,
        evidence_complete_passed: hasTelemetry,
        action_compatibility_passed: rule04Passed,
        case_state_passed: rule05Passed,
        workspace_isolation_passed: rule07Passed,
        provider_state_passed: rule08Passed,
        approved_tool_passed: rule09Passed,
      },
    };
    persistEvaluation(dec, caseData, workspace.id, action);
    return dec;
  }

  // Check any blocking failure
  const failingRule = rules.find((r) => !r.passed);
  if (failingRule) {
    let triggered = failingRule.id;
    let decision: "HALT" | "HUMAN_REVIEW" = "HALT";

    if (failingRule.id === "RULE_10_ESCALATION_CHECK") {
      triggered = "DIAGNOSIS_RECOMMENDED_ESCALATION";
      decision = "HUMAN_REVIEW";
    }

    const dec: PolicyDecision = {
      evaluation_id: evaluationId,
      decision,
      allowed: false,
      action_to_take: "escalate_to_human",
      rule_triggered: triggered,
      reason: failingRule.reason,
      evaluated_at: evaluatedAt,
      rules,
      checks: {
        confidence_passed: rule01Passed,
        amount_passed: rule02Passed,
        remediation_limit_passed: rule06Passed,
        allowed_action_passed: rule03Passed,
        evidence_complete_passed: hasTelemetry,
        action_compatibility_passed: rule04Passed,
        case_state_passed: rule05Passed,
        workspace_isolation_passed: rule07Passed,
        provider_state_passed: rule08Passed,
        approved_tool_passed: rule09Passed,
      },
    };
    persistEvaluation(dec, caseData, workspace.id, action);
    return dec;
  }

  // ALL 10 GUARDRAILS PASSED!
  const dec: PolicyDecision = {
    evaluation_id: evaluationId,
    decision: "ALLOW",
    allowed: true,
    action_to_take: action,
    rule_triggered: "POLICY_CHECKS_PASSED",
    reason: `All 10 agentic security guardrails passed. Bounded action '${action}' approved for server-authorized execution.`,
    evaluated_at: evaluatedAt,
    rules,
    checks: {
      confidence_passed: true,
      amount_passed: true,
      remediation_limit_passed: true,
      allowed_action_passed: true,
      evidence_complete_passed: true,
      action_compatibility_passed: true,
      case_state_passed: true,
      workspace_isolation_passed: true,
      provider_state_passed: true,
      approved_tool_passed: true,
    },
  };
  persistEvaluation(dec, caseData, workspace.id, action);
  return dec;
}

function persistEvaluation(
  decision: PolicyDecision,
  caseData: RefundCase,
  workspaceId: string,
  requestedAction: AllowedAction
): void {
  const record: PolicyEvaluationRecord = {
    evaluation_id: decision.evaluation_id,
    case_id: caseData.case_id,
    workspace_id: workspaceId,
    confidence: caseData.latest_diagnosis?.confidence ?? 0,
    amount: caseData.amount,
    requested_action: requestedAction,
    decision: decision.decision,
    rule_triggered: decision.rule_triggered,
    reason: decision.reason,
    authorization_id: decision.authorization_id,
    rules: decision.rules,
    evaluated_at: decision.evaluated_at,
  };
  Database.savePolicyEvaluation(record);
}
