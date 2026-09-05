import { Database } from "../db";
import { ToolExecutionResult, OutcomeVerification, AllowedAction, EventTrailItem, CaseStatus } from "@/types";
import { RazorpayClient } from "../razorpay/client";

export interface PaymentProviderAdapter {
  providerName: "RAZORPAY_LIVE" | "RAZORPAY_TEST" | "DEVELOPMENT_SANDBOX";
  resendWebhook(workspaceId: string, caseId: string): Promise<ToolExecutionResult>;
  refreshStatus(workspaceId: string, caseId: string): Promise<ToolExecutionResult>;
  reconcileState(workspaceId: string, caseId: string): Promise<ToolExecutionResult>;
  escalateToHuman(workspaceId: string, caseId: string, reason: string, status?: CaseStatus): Promise<ToolExecutionResult>;
  verifyRefundStatus(workspaceId: string, caseId: string): Promise<OutcomeVerification>;
}

export class SandboxPaymentAdapter implements PaymentProviderAdapter {
  providerName: "RAZORPAY_LIVE" | "RAZORPAY_TEST" | "DEVELOPMENT_SANDBOX" = "DEVELOPMENT_SANDBOX";

  async resendWebhook(workspaceId: string, caseId: string): Promise<ToolExecutionResult> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found in workspace.`);

    refundCase.remediation_attempts += 1;
    refundCase.evidence.webhook_status = "DELIVERED";
    refundCase.current_status = "ACTION_IN_PROGRESS";

    const newEvent: EventTrailItem = {
      id: `evt_act_wh_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "WEBHOOK_DISPATCHER",
      event_type: "merchant_webhook_sync",
      status: "SUCCESS",
      details: "Merchant Webhook Dispatcher: Re-sent signed HMAC webhook event to configured merchant endpoint.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    Database.updateCase(workspaceId, refundCase);

    return {
      tool_name: "resend_webhook",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Merchant webhook re-delivered successfully with HTTP 200 OK acknowledgement.",
      payload: { webhook_status: "DELIVERED", retry_count: 1 },
      provider_environment: "DEVELOPMENT_SANDBOX",
    };
  }

  async refreshStatus(workspaceId: string, caseId: string): Promise<ToolExecutionResult> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found in workspace.`);

    refundCase.remediation_attempts += 1;
    refundCase.current_status = "ACTION_IN_PROGRESS";

    if (refundCase.is_planted_failure) {
      // Planted failure test fixture: status remains pending
      refundCase.evidence.bank_status = "NO_UPDATE";
      const newEvent: EventTrailItem = {
        id: `evt_act_planted_${Date.now()}`,
        timestamp: new Date().toISOString(),
        system: "GATEWAY",
        event_type: "gateway_status_sync",
        status: "FAILED",
        details: "Gateway status synchronization returned UNRESOLVED_PENDING status.",
      };
      refundCase.evidence.event_trail.push(newEvent);
      Database.updateCase(workspaceId, refundCase);

      return {
        tool_name: "refresh_status",
        case_id: caseId,
        executed_at: new Date().toISOString(),
        success: true,
        output: "Queried payment gateway status. Gateway reports transaction remains in processing limbo.",
        payload: { state: "UNRESOLVED_PENDING" },
        provider_environment: "DEVELOPMENT_SANDBOX",
      };
    }

    refundCase.evidence.bank_status = "CREDIT_CONFIRMED";
    refundCase.evidence.gateway_status = "ACKNOWLEDGED";
    const newEvent: EventTrailItem = {
      id: `evt_act_sync_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "GATEWAY",
      event_type: "gateway_status_sync",
      status: "SUCCESS",
      details: "Queried downstream gateway state; confirmed payment reversal terminal status.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    Database.updateCase(workspaceId, refundCase);

    return {
      tool_name: "refresh_status",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Refreshed gateway status. Confirmed refund terminal status.",
      payload: { status: "PROCESSED" },
      provider_environment: "DEVELOPMENT_SANDBOX",
    };
  }

  async reconcileState(workspaceId: string, caseId: string): Promise<ToolExecutionResult> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found in workspace.`);

    refundCase.remediation_attempts += 1;
    refundCase.evidence.ledger_status = "REFUNDED";
    refundCase.current_status = "ACTION_IN_PROGRESS";

    const newEvent: EventTrailItem = {
      id: `evt_act_rec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "MERCHANT_LEDGER",
      event_type: "ledger_reconciliation_sync",
      status: "SUCCESS",
      details: "Merchant accounting ledger synchronized with gateway settlement batch.",
    };
    refundCase.evidence.event_trail.push(newEvent);
    Database.updateCase(workspaceId, refundCase);

    return {
      tool_name: "reconcile_state",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: "Merchant ledger state reconciled with gateway records.",
      payload: { ledger_status: "REFUNDED" },
      provider_environment: "DEVELOPMENT_SANDBOX",
    };
  }

  async escalateToHuman(
    workspaceId: string,
    caseId: string,
    reason: string,
    specificStatus?: CaseStatus
  ): Promise<ToolExecutionResult> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found.`);

    const targetStatus = specificStatus || "ESCALATED_HUMAN";
    refundCase.current_status = targetStatus;

    const newEvent: EventTrailItem = {
      id: `evt_act_esc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: "GATEWAY",
      event_type: "escalated_to_human_ops",
      status: "PENDING",
      details: `Escalated to Human Ops Review Queue. Reason: ${reason}`,
    };
    refundCase.evidence.event_trail.push(newEvent);
    Database.updateCase(workspaceId, refundCase);

    return {
      tool_name: "escalate_to_human",
      case_id: caseId,
      executed_at: new Date().toISOString(),
      success: true,
      output: `Refund escalated to Human Operations Queue [Status: ${targetStatus}].`,
      payload: { reason, status: targetStatus },
      provider_environment: "DEVELOPMENT_SANDBOX",
    };
  }

  async verifyRefundStatus(workspaceId: string, caseId: string): Promise<OutcomeVerification> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found.`);

    if (refundCase.is_planted_failure && refundCase.evidence.bank_status !== "CREDIT_CONFIRMED") {
      return {
        verified_at: new Date().toISOString(),
        observed_status: "STILL_PENDING",
        remediation_effective: false,
        details: "CRITICAL: Downstream settlement status remains unresolved. State did not mutate after remediation attempt.",
      };
    }

    const { gateway_status, bank_status, webhook_status } = refundCase.evidence;
    const isResolved =
      gateway_status === "ACKNOWLEDGED" &&
      bank_status === "CREDIT_CONFIRMED" &&
      webhook_status === "DELIVERED";

    if (isResolved) {
      return {
        verified_at: new Date().toISOString(),
        observed_status: "RESOLVED",
        remediation_effective: true,
        details: "Verification succeeded: All payment records (Gateway, Settlement Status, Webhook Delivery) are synchronized and terminal.",
      };
    }

    return {
      verified_at: new Date().toISOString(),
      observed_status: "STILL_PENDING",
      remediation_effective: false,
      details: `Verification incomplete: Bank=${bank_status}, Webhook=${webhook_status}.`,
    };
  }
}

export class RazorpayLiveAdapter extends SandboxPaymentAdapter {
  override providerName = "RAZORPAY_LIVE" as const;

  override async refreshStatus(workspaceId: string, caseId: string): Promise<ToolExecutionResult> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found.`);

    const client = RazorpayClient.forWorkspace(workspaceId);
    if (!client.isConfigured() || !refundCase.refund_id.startsWith("rfnd_")) {
      return super.refreshStatus(workspaceId, caseId);
    }

    try {
      const res = await client.request<any>(`/refunds/${refundCase.refund_id}`, {
        method: "GET",
      });

      if (res.status === 200 && res.data) {
        const data = res.data;
        const status = data.status || "processed";
        refundCase.current_status = status === "processed" ? "RESOLVED" : "INVESTIGATING";
        Database.updateCase(workspaceId, refundCase);

        return {
          tool_name: "refresh_status",
          case_id: caseId,
          executed_at: new Date().toISOString(),
          success: true,
          output: `[Razorpay API] Fetched refund ${refundCase.refund_id}: status is '${status}'.`,
          payload: data,
          provider_environment: client.mode === "live" ? "RAZORPAY_LIVE" : "RAZORPAY_TEST",
        };
      }
    } catch (err: any) {
      console.warn("[RazorpayLiveAdapter] API query failed:", err?.message);
    }

    return super.refreshStatus(workspaceId, caseId);
  }

  override async verifyRefundStatus(workspaceId: string, caseId: string): Promise<OutcomeVerification> {
    const refundCase = Database.getCase(workspaceId, caseId);
    if (!refundCase) throw new Error(`Refund ${caseId} not found.`);

    const client = RazorpayClient.forWorkspace(workspaceId);
    if (!client.isConfigured() || !refundCase.refund_id.startsWith("rfnd_")) {
      return super.verifyRefundStatus(workspaceId, caseId);
    }

    try {
      const res = await client.request<any>(`/refunds/${refundCase.refund_id}`, {
        method: "GET",
      });

      if (res.status === 200 && res.data) {
        const data = res.data;
        if (data.status === "processed") {
          return {
            verified_at: new Date().toISOString(),
            observed_status: "RESOLVED",
            remediation_effective: true,
            details: `[Razorpay API] Verified refund ${refundCase.refund_id} is 'processed' (Payment: ${data.payment_id}).`,
          };
        }
      }
    } catch (err: any) {
      console.warn("[RazorpayLiveAdapter] API verification failed:", err?.message);
    }

    return super.verifyRefundStatus(workspaceId, caseId);
  }
}

export function getPaymentAdapter(provider?: string, workspaceId?: string): PaymentProviderAdapter {
  if (workspaceId) {
    const client = RazorpayClient.forWorkspace(workspaceId);
    if (client.isConfigured()) {
      return new RazorpayLiveAdapter();
    }
  }
  if (provider === "razorpay_live" || provider === "razorpay_test") {
    return new RazorpayLiveAdapter();
  }
  return new SandboxPaymentAdapter();
}
