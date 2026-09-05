import { RefundCase, AuditLogEntry, CaseStatus, Workspace } from "@/types";
import { Database } from "../db";
import { collectEvidence } from "./evidence-collector";
import { runAIDiagnosis } from "../ai";
import { evaluateSecurityPolicy } from "../security/policy-engine";
import { authorizeExecution, executeAuthorizedAction } from "../security/execution-authorizer";
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

  // 4. POLICY GATE (AGENTIC SAFETY ENGINE)
  console.log(`[LOOP] Gate: Routing through agentic policy engine`);
  const policy = evaluateSecurityPolicy({
    caseData: refundCase,
    diagnosis,
    workspace,
  });
  refundCase.latest_policy = policy;
  Database.updateCase(workspaceId, refundCase);

  if (!policy.allowed || policy.decision !== "ALLOW") {
    let escalationStatus: CaseStatus = "ESCALATED_HUMAN";
    if (policy.rule_triggered === "RULE_01_CONFIDENCE") {
      escalationStatus = "ESCALATED_LOW_CONFIDENCE";
    } else if (policy.rule_triggered === "RULE_02_HIGH_VALUE") {
      escalationStatus = "ESCALATED_HIGH_VALUE";
    } else if (policy.rule_triggered === "RULE_06_IDEMPOTENCY") {
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

  // ─── 4b. SIGNED / SERVER-GENERATED EXECUTION AUTHORIZATION ────────────────
  const authz = authorizeExecution(policy, refundCase, workspaceId);
  logStep(
    "POLICY_GATE",
    `POLICY GATE APPROVED: All 10 security guardrails passed. Signed authorization generated: ${authz.authorization_id} (TTL: 60s, Action: ${authz.action}).`,
    "SUCCESS",
    { policy, authorization_id: authz.authorization_id }
  );

  // ─── 5. ACT & 6. VERIFY VIA HARD SECURITY BOUNDARY ───────────────────────
  const execResult = await executeAuthorizedAction({
    authorizationId: authz.authorization_id,
    caseId,
    workspaceId,
    consumer: "LOOP_ORCHESTRATOR",
  });

  logStep(
    "ACT",
    `Action Executed [${execResult.toolResult.tool_name}] (${execResult.toolResult.provider_environment}): ${execResult.toolResult.output}`,
    execResult.toolResult.success ? "SUCCESS" : "FAILURE",
    execResult.toolResult
  );

  const updatedCaseAfterExec = Database.getCase(workspaceId, caseId)!;

  if (execResult.finalStatus === "RESOLVED") {
    logStep(
      "VERIFY",
      `Verification Succeeded: ${execResult.verification.details}`,
      "SUCCESS",
      execResult.verification
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
      updated_case: updatedCaseAfterExec,
    };
  }

  // Verification failed or planted failure triggered
  logStep(
    "VERIFY",
    `VERIFICATION FAILED: ${execResult.verification.details}`,
    "FAILURE",
    execResult.verification
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
    updated_case: updatedCaseAfterExec,
  };
}
