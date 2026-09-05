import crypto from "crypto";
import type {
  ExecutionAuthorization,
  PolicyDecision,
  RefundCase,
  AllowedAction,
  ToolExecutionResult,
  OutcomeVerification,
  CaseStatus,
} from "@/types";
import { Database } from "../db";
import { getPaymentAdapter } from "../payment/adapter";
import { AUTHORIZED_TOOLS, ELIGIBLE_CASE_STATES } from "./policy-engine";

/**
 * Execution Authorization Lifetime: 60 Seconds strict TTL.
 * After 60s, token expires and requires fresh investigation & policy check.
 */
export const AUTHORIZATION_TTL_MS = 60_000;

function computeStateSnapshotHash(caseData: RefundCase): string {
  const content = `${caseData.case_id}:${caseData.amount}:${caseData.current_status}:${caseData.evidence?.webhook_status}:${caseData.evidence?.bank_status}:${caseData.remediation_attempts}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Server-Side Authorizer.
 * Generates an opaque, cryptographically random, single-use, time-bounded execution token.
 * ONLY called when policy-engine.ts returns decision: "ALLOW".
 */
export function authorizeExecution(
  policyDecision: PolicyDecision,
  caseData: RefundCase,
  workspaceId: string
): ExecutionAuthorization {
  if (policyDecision.decision !== "ALLOW" || !policyDecision.allowed) {
    throw new Error("SECURITY_VIOLATION: Cannot generate execution authorization for non-allowed policy decision.");
  }

  const now = Date.now();
  const authorizationId = `authz_${crypto.randomBytes(24).toString("hex")}`;
  const snapshotHash = computeStateSnapshotHash(caseData);

  const authz: ExecutionAuthorization = {
    authorization_id: authorizationId,
    evaluation_id: policyDecision.evaluation_id,
    case_id: caseData.case_id,
    workspace_id: workspaceId,
    action: policyDecision.action_to_take,
    created_at: now,
    expires_at: now + AUTHORIZATION_TTL_MS,
    consumed: false,
    snapshot_hash: snapshotHash,
  };

  policyDecision.authorization_id = authorizationId;
  Database.createExecutionAuthorization(authz);

  // Audit event: EXECUTION_AUTHORIZED
  Database.addAuditLog({
    workspace_id: workspaceId,
    case_id: caseData.case_id,
    actor: "POLICY_ENGINE",
    stage: "POLICY_GATE",
    action: "EXECUTION_AUTHORIZED",
    provider: "SECURITY_AUTHORIZER",
    message: `Signed execution authorization created: ${authorizationId} (TTL: 60s, Action: ${authz.action}).`,
    status: "SUCCESS",
    details: {
      authorization_id: authorizationId,
      evaluation_id: authz.evaluation_id,
      expires_at: new Date(authz.expires_at).toISOString(),
    },
  });

  return authz;
}

/**
 * Human Operator Security Authorization.
 * Generates an authorized single-use execution token when an authorized operator
 * explicitly approves remediation on an escalated/paused refund.
 */
export function authorizeHumanApproval(
  caseData: RefundCase,
  workspaceId: string,
  operatorEmail: string
): ExecutionAuthorization {
  const now = Date.now();
  const authorizationId = `authz_human_${crypto.randomBytes(24).toString("hex")}`;
  const snapshotHash = computeStateSnapshotHash(caseData);

  const action =
    caseData.latest_diagnosis?.recommended_action === "escalate_to_human"
      ? caseData.failure_class === "WEBHOOK_MISSING"
        ? "resend_webhook"
        : caseData.failure_class === "LEDGER_MISMATCH"
        ? "reconcile_state"
        : "refresh_status"
      : caseData.latest_diagnosis?.recommended_action || "refresh_status";

  const authz: ExecutionAuthorization = {
    authorization_id: authorizationId,
    evaluation_id: caseData.latest_policy?.evaluation_id || `eval_human_${now}`,
    case_id: caseData.case_id,
    workspace_id: workspaceId,
    action: action as AllowedAction,
    created_at: now,
    expires_at: now + AUTHORIZATION_TTL_MS,
    consumed: false,
    snapshot_hash: snapshotHash,
  };

  Database.createExecutionAuthorization(authz);

  Database.addAuditLog({
    workspace_id: workspaceId,
    case_id: caseData.case_id,
    actor: "HUMAN_OPERATOR",
    stage: "POLICY_GATE",
    action: "HUMAN_APPROVAL_GRANTED",
    provider: "SECURITY_AUTHORIZER",
    message: `Human operator (${operatorEmail}) authorized remediation execution: ${authorizationId} (Action: ${authz.action}).`,
    status: "SUCCESS",
    details: {
      authorization_id: authorizationId,
      approved_by: operatorEmail,
      action: authz.action,
      expires_at: new Date(authz.expires_at).toISOString(),
    },
  });

  return authz;
}

export interface ExecutionContext {
  authorizationId: string;
  caseId: string;
  workspaceId: string;
  consumer?: string;
}

export interface ExecutionResult {
  toolResult: ToolExecutionResult;
  verification: OutcomeVerification;
  finalStatus: CaseStatus;
}

/**
 * HARD SECURITY BOUNDARY: executeAuthorizedAction
 *
 * Validates:
 * 1. Server authorization token exists.
 * 2. Token workspace matches session workspace.
 * 3. Token case matches target case.
 * 4. Token has NOT been consumed (idempotency / race condition protection).
 * 5. Token has NOT expired (< 60s TTL).
 * 6. Action is in server-side allowlist.
 * 7. Current case state is still in eligible processing state.
 * 8. Current case state snapshot matches the snapshot when authorization was issued.
 *
 * ONLY THEN is the payment adapter method invoked.
 */
export async function executeAuthorizedAction(ctx: ExecutionContext): Promise<ExecutionResult> {
  const { authorizationId, caseId, workspaceId, consumer = "AGENT_CORE" } = ctx;

  // 1-5. Atomic token consumption & workspace/case validation
  const consumeRes = Database.consumeExecutionAuthorization(
    authorizationId,
    workspaceId,
    caseId,
    consumer
  );

  if (!consumeRes.success || !consumeRes.authorization) {
    // Log security rejection event
    Database.addAuditLog({
      workspace_id: workspaceId,
      case_id: caseId,
      actor: "PAYMENT_EXECUTOR",
      stage: "ACT",
      action: "EXECUTION_REJECTED",
      provider: "SECURITY_AUTHORIZER",
      message: `Execution rejected at security boundary: ${consumeRes.error}`,
      status: "FAILURE",
      details: { authorization_id: authorizationId, error: consumeRes.error },
    });
    throw new Error(consumeRes.error || "EXECUTION_NOT_AUTHORIZED");
  }

  const authz = consumeRes.authorization;

  // 6. Action allowlist validation
  if (!AUTHORIZED_TOOLS.includes(authz.action)) {
    Database.addAuditLog({
      workspace_id: workspaceId,
      case_id: caseId,
      actor: "PAYMENT_EXECUTOR",
      stage: "ACT",
      action: "EXECUTION_REJECTED",
      provider: "SECURITY_AUTHORIZER",
      message: `Execution rejected: Action '${authz.action}' not in server allowlist.`,
      status: "FAILURE",
      details: { action: authz.action },
    });
    throw new Error(`EXECUTION_NOT_AUTHORIZED: Action '${authz.action}' is prohibited.`);
  }

  // Fetch current live case
  const currentCase = Database.getCase(workspaceId, caseId);
  if (!currentCase) {
    throw new Error(`Case ${caseId} not found in workspace.`);
  }

  // 7. Case state check
  if (!ELIGIBLE_CASE_STATES.includes(currentCase.current_status as any)) {
    Database.addAuditLog({
      workspace_id: workspaceId,
      case_id: caseId,
      actor: "PAYMENT_EXECUTOR",
      stage: "ACT",
      action: "EXECUTION_REJECTED",
      provider: "SECURITY_AUTHORIZER",
      message: `Execution rejected: Case status is '${currentCase.current_status}' (not eligible).`,
      status: "WARNING",
      details: { current_status: currentCase.current_status },
    });
    throw new Error(`EXECUTION_REJECTED: Case status '${currentCase.current_status}' is not eligible for autonomous execution.`);
  }

  // 8. State snapshot hash check (Detects stale diagnosis / concurrent mutations)
  const currentHash = computeStateSnapshotHash(currentCase);
  if (currentHash !== authz.snapshot_hash) {
    Database.addAuditLog({
      workspace_id: workspaceId,
      case_id: caseId,
      actor: "PAYMENT_EXECUTOR",
      stage: "ACT",
      action: "EXECUTION_REJECTED",
      provider: "SECURITY_AUTHORIZER",
      message: `Execution rejected: Case state mutated since authorization. Stale authorization invalidated.`,
      status: "WARNING",
      details: { expected_hash: authz.snapshot_hash, actual_hash: currentHash },
    });
    throw new Error("EXECUTION_REJECTED: State mutated since policy authorization. Fresh investigation required.");
  }

  // ─── HARD BOUNDARY PASSED: INVOKE PAYMENT ADAPTER ─────────────────────────
  const workspace = Database.getWorkspace(workspaceId);
  const adapter = getPaymentAdapter(workspace?.provider || "sandbox");

  currentCase.current_status = "ACTION_IN_PROGRESS";
  Database.updateCase(workspaceId, currentCase);

  let toolResult: ToolExecutionResult;
  switch (authz.action) {
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
      toolResult = await adapter.escalateToHuman(workspaceId, caseId, "Unknown authorized action.");
      break;
  }

  currentCase.latest_action = toolResult;
  Database.updateCase(workspaceId, currentCase);

  Database.addAuditLog({
    workspace_id: workspaceId,
    case_id: caseId,
    actor: "PAYMENT_EXECUTOR",
    stage: "ACT",
    action: "ACTION_EXECUTED",
    provider: toolResult.provider_environment || "DEVELOPMENT_SANDBOX",
    message: `Payment operation executed [${toolResult.tool_name}]: ${toolResult.output}`,
    status: toolResult.success ? "SUCCESS" : "FAILURE",
    details: {
      tool_name: toolResult.tool_name,
      authorization_id: authorizationId,
      output: toolResult.output,
    },
  });

  // ─── INDEPENDENT VERIFICATION ──────────────────────────────────────────────
  currentCase.current_status = "VERIFYING";
  Database.updateCase(workspaceId, currentCase);

  const verification = await adapter.verifyRefundStatus(workspaceId, caseId);
  currentCase.latest_verification = verification;

  let finalStatus: CaseStatus = "ESCALATED_FAILED_REMEDIATION";
  if (verification.observed_status === "RESOLVED") {
    finalStatus = "RESOLVED";
    currentCase.current_status = "RESOLVED";
  } else {
    currentCase.current_status = "ESCALATED_FAILED_REMEDIATION";
    if (currentCase.latest_diagnosis) {
      currentCase.latest_diagnosis.confidence = 0.35;
    }
    await adapter.escalateToHuman(
      workspaceId,
      caseId,
      `Remediation executed but verification confirmed case remained unresolved (${verification.observed_status}).`,
      "ESCALATED_FAILED_REMEDIATION"
    );
  }
  Database.updateCase(workspaceId, currentCase);

  Database.addAuditLog({
    workspace_id: workspaceId,
    case_id: caseId,
    actor: "INDEPENDENT_VERIFIER",
    stage: "VERIFY",
    action: "VERIFICATION_COMPLETED",
    provider: "GATEWAY_DOWNSTREAM",
    message: `Independent verification completed: Observed=${verification.observed_status}, Effective=${verification.remediation_effective}. Final status='${finalStatus}'.`,
    status: verification.remediation_effective ? "SUCCESS" : "WARNING",
    details: {
      verification,
      final_status: finalStatus,
      authorization_id: authorizationId,
    },
  });

  return {
    toolResult,
    verification,
    finalStatus,
  };
}
