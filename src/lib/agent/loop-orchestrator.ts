import { RefundCase, AuditLogEntry, CaseStatus, Workspace } from "@/types";
import { Database } from "../db";
import { collectEvidence } from "./evidence-collector";
import { runAIDiagnosis } from "../ai";
import { evaluatePolicy } from "../policy/engine";
import { getPaymentAdapter } from "../payment/adapter";

export interface LoopExecutionStep {
  step: "DETECT" | "INVESTIGATE" | "DIAGNOSE" | "POLICY_GATE" | "ACT" | "VERIFY" | "OUTCOME";
  timestamp: string;
  details: string;
  data?: any;
}

export interface LoopExecutionResult {
  case_id: string;
  previous_status: CaseStatus;
  final_status: CaseStatus;
  value_resolved: number;
  steps: LoopExecutionStep[];
  updated_case: RefundCase;
}

export async function runAgentLoopForCase(
  workspaceId: string,
  caseId: string,
  apiKeyOverride?: { provider?: string; apiKey?: string }
): Promise<LoopExecutionResult> {
  const refundCase = Database.getCase(workspaceId, caseId);
  if (!refundCase) {
    throw new Error(`Refund ${caseId} not found in workspace ${workspaceId}.`);
  }

  const workspace = Database.getWorkspace(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found.`);
  }

  const adapter = getPaymentAdapter(workspace.provider);
  const previousStatus = refundCase.current_status;
  const steps: LoopExecutionStep[] = [];

  const logStep = (
    step: LoopExecutionStep["step"],
    details: string,
    status: AuditLogEntry["status"] = "INFO",
    data?: any
  ) => {
    const timestamp = new Date().toISOString();
    steps.push({ step, timestamp, details, data });
    Database.addAuditLog({
      workspace_id: workspaceId,
      case_id: caseId,
      actor: "AGENT_CORE",
      stage: step,
      action: step,
      provider: workspace.provider,
      message: details,
      status,
      details: data,
    });
  };

  // 1. DETECT
  logStep(
    "DETECT",
    `Detected stuck refund ${caseId} in state '${previousStatus}' (Liability: ₹${refundCase.amount.toLocaleString("en-IN")}, Age: ${refundCase.age_days}d).`
  );

  // 2. INVESTIGATE
  refundCase.current_status = "INVESTIGATING";
  Database.updateCase(workspaceId, refundCase);
  const evidence = collectEvidence(refundCase);
  refundCase.evidence = evidence;
  logStep(
    "INVESTIGATE",
    `Correlated 5 payment subsystems: Gateway=${evidence.gateway_status}, Settlement Leg=${evidence.bank_status}, Webhook=${evidence.webhook_status}, Destination=${evidence.destination_status}, Ledger=${evidence.ledger_status}. Conflicting Signals=${evidence.has_conflicting_signals ? "YES" : "NO"}`,
    evidence.has_conflicting_signals ? "WARNING" : "INFO",
    evidence
  );

  // 3. DIAGNOSE (REAL EXTERNAL AI)
  const diagnosis = await runAIDiagnosis(refundCase, evidence, apiKeyOverride);
  refundCase.latest_diagnosis = diagnosis;
  Database.updateCase(workspaceId, refundCase);

  if (diagnosis.provider === "AI_UNAVAILABLE") {
    logStep(
      "DIAGNOSE",
      `AI Unavailable: Real AI provider not configured or unreachable. Halting autonomous loop safely.`,
      "WARNING",
      diagnosis
    );
  } else {
    logStep(
      "DIAGNOSE",
      `AI Diagnosis [${diagnosis.provider} / ${diagnosis.model || "default"}]: Stage='${diagnosis.likely_stage.toUpperCase()}' | Confidence=${(diagnosis.confidence * 100).toFixed(0)}% | Recommended='${diagnosis.recommended_action}'. ${diagnosis.reasoning}`,
      diagnosis.confidence >= workspace.confidence_threshold ? "SUCCESS" : "WARNING",
      diagnosis
    );
  }

  // 4. POLICY GATE (DETERMINISTIC SAFETY CODE)
  const policy = evaluatePolicy(refundCase, diagnosis, {
    seed: 0,
    difficulty: "normal",
    count: 0,
    confidence_threshold: workspace.confidence_threshold,
    high_value_limit: workspace.high_value_limit,
  });
  refundCase.latest_policy = policy;
  Database.updateCase(workspaceId, refundCase);

  if (!policy.allowed) {
    let escalationStatus: CaseStatus = "ESCALATED_HUMAN";
    if (policy.rule_triggered === "RULE_1_LOW_CONFIDENCE") {
      escalationStatus = "ESCALATED_LOW_CONFIDENCE";
    } else if (policy.rule_triggered === "RULE_2_HIGH_VALUE_THRESHOLD") {
      escalationStatus = "ESCALATED_HIGH_VALUE";
    } else if (policy.rule_triggered === "RULE_3_MAX_REMEDIATION_LIMIT") {
      escalationStatus = "ESCALATED_MAX_REMEDIATIONS";
    }

    await adapter.escalateToHuman(workspaceId, caseId, policy.reason, escalationStatus);
    logStep(
      "POLICY_GATE",
      `POLICY GATE TRIGGERED [${policy.rule_triggered}]: Autonomous execution blocked. ${policy.reason}`,
      "WARNING",
      policy
    );
    logStep(
      "OUTCOME",
      `Closed loop with Human Escalation [Status: ${escalationStatus}]. Zero financial exposure incurred.`,
      "INFO"
    );

    const updated = Database.getCase(workspaceId, caseId)!;
    return {
      case_id: caseId,
      previous_status: previousStatus,
      final_status: escalationStatus,
      value_resolved: 0,
      steps,
      updated_case: updated,
    };
  }

  // Policy approved!
  logStep(
    "POLICY_GATE",
    `POLICY GATE APPROVED: Confidence ${(diagnosis.confidence * 100).toFixed(0)}% >= ${(workspace.confidence_threshold * 100).toFixed(0)}%, Amount ₹${refundCase.amount.toLocaleString("en-IN")} <= ₹${workspace.high_value_limit.toLocaleString("en-IN")}. Action authorized: '${policy.action_to_take}'.`,
    "SUCCESS",
    policy
  );

  // 5. ACT (VIA PAYMENT PROVIDER ADAPTER)
  refundCase.current_status = "ACTION_IN_PROGRESS";
  Database.updateCase(workspaceId, refundCase);

  let toolResult;
  switch (policy.action_to_take) {
    case "resend_webhook":
      toolResult = await adapter.resendWebhook(workspaceId, caseId);
      break;
    case "refresh_status":
    case "verify_refund":
      toolResult = await adapter.refreshStatus(workspaceId, caseId);
      break;
    case "reconcile_state":
      toolResult = await adapter.reconcileState(workspaceId, caseId);
      break;
    default:
      toolResult = await adapter.escalateToHuman(workspaceId, caseId, "Unsupported action in policy execution");
      break;
  }

  refundCase.latest_action = toolResult;
  Database.updateCase(workspaceId, refundCase);
  logStep(
    "ACT",
    `Action Executed [${toolResult.tool_name}] (${toolResult.provider_environment}): ${toolResult.output}`,
    toolResult.success ? "SUCCESS" : "FAILURE",
    toolResult
  );

  // 6. VERIFY (OUTCOME STATE VERIFICATION)
  refundCase.current_status = "VERIFYING";
  Database.updateCase(workspaceId, refundCase);

  const verification = await adapter.verifyRefundStatus(workspaceId, caseId);
  refundCase.latest_verification = verification;

  if (verification.observed_status === "RESOLVED") {
    refundCase.current_status = "RESOLVED";
    Database.updateCase(workspaceId, refundCase);

    logStep(
      "VERIFY",
      `Verification Succeeded: ${verification.details}`,
      "SUCCESS",
      verification
    );
    logStep(
      "OUTCOME",
      `CLOSED LOOP: Refund ₹${refundCase.amount.toLocaleString("en-IN")} verified resolved. Refund liability resolved.`,
      "SUCCESS",
      { resolved: refundCase.amount }
    );

    return {
      case_id: caseId,
      previous_status: previousStatus,
      final_status: "RESOLVED",
      value_resolved: refundCase.amount,
      steps,
      updated_case: Database.getCase(workspaceId, caseId)!,
    };
  }

  // 7. VERIFICATION FAILED (PLANTED FAILURE FIXTURE OR INEFFECTIVE REMEDIATION)
  refundCase.current_status = "ESCALATED_FAILED_REMEDIATION";
  if (refundCase.latest_diagnosis) {
    refundCase.latest_diagnosis.confidence = 0.35;
  }
  Database.updateCase(workspaceId, refundCase);

  await adapter.escalateToHuman(
    workspaceId,
    caseId,
    `Autonomous remediation '${policy.action_to_take}' executed but verification confirmed case remained unresolved (${verification.observed_status}). Agent stopped safely to prevent loop.`,
    "ESCALATED_FAILED_REMEDIATION"
  );

  logStep(
    "VERIFY",
    `VERIFICATION FAILED: ${verification.details}`,
    "FAILURE",
    verification
  );
  logStep(
    "OUTCOME",
    `CLOSED LOOP: Agent detected failed verification. Refused to retry blindly. Reduced confidence to 35% and escalated safely to Human Ops.`,
    "WARNING",
    { remediation_failed: true }
  );

  return {
    case_id: caseId,
    previous_status: previousStatus,
    final_status: "ESCALATED_FAILED_REMEDIATION",
    value_resolved: 0,
    steps,
    updated_case: Database.getCase(workspaceId, caseId)!,
  };
}
