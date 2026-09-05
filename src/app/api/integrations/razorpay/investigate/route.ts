import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";
import { fetchRazorpayPayment } from "@/lib/razorpay/payments";
import { fetchPaymentRefunds } from "@/lib/razorpay/refunds";
import type { RefundCase, EvidencePackage, EventTrailItem, FailureClass } from "@/types";

export async function POST(req: Request) {
  try {
    const { user, workspace } = await requireAuth();
    const { payment_id } = await req.json();

    if (!payment_id || typeof payment_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Payment ID is required (e.g. pay_xxxxxxxxx)." },
        { status: 400 }
      );
    }

    const trimmedId = payment_id.trim();

    // Query real Razorpay API with workspace credentials
    const paymentResult = await fetchRazorpayPayment(trimmedId, { workspaceId: workspace.id });

    if (!paymentResult.success || !paymentResult.payment) {
      return NextResponse.json(
        {
          success: false,
          error: paymentResult.error || "Payment not found in connected Razorpay account.",
        },
        { status: 404 }
      );
    }

    const p = paymentResult.payment;
    const refundsResult = await fetchPaymentRefunds(trimmedId, { workspaceId: workspace.id });
    const refunds = refundsResult.refunds || [];

    const amountInRupees = (p.amount || 0) / 100;
    const paymentCreatedAt = p.created_at
      ? new Date(p.created_at * 1000).toISOString()
      : new Date().toISOString();
    const ageDays = Math.max(
      1,
      Math.floor((Date.now() - new Date(paymentCreatedAt).getTime()) / (86400 * 1000))
    );

    let failureClass: FailureClass = "WEBHOOK_MISSING";
    if (p.status === "failed") {
      failureClass = "BANK_LEG_STUCK";
    } else if (p.refund_status === "partial" || refunds.length > 0) {
      failureClass = "LEDGER_MISMATCH";
    } else if (p.error_code) {
      failureClass = "AMBIGUOUS";
    }

    const eventTrail: EventTrailItem[] = [
      {
        id: `evt_pay_created_${p.id}`,
        timestamp: paymentCreatedAt,
        event_type: "PAYMENT_INITIATED",
        system: "GATEWAY",
        status: "SUCCESS",
        details: `Payment initiated via ${p.method.toUpperCase()} (${p.currency} ${amountInRupees}).`,
      },
      {
        id: `evt_pay_auth_${p.id}`,
        timestamp: paymentCreatedAt,
        event_type: "PAYMENT_AUTHORIZED",
        system: "NPCI_BANK",
        status: p.status === "failed" ? "FAILED" : "SUCCESS",
        details: p.error_description || `Gateway processed status: ${p.status}.`,
      },
    ];

    if (refunds.length > 0) {
      for (const rf of refunds) {
        eventTrail.push({
          id: `evt_rfnd_${rf.id}`,
          timestamp: rf.created_at ? new Date(rf.created_at * 1000).toISOString() : new Date().toISOString(),
          event_type: "REFUND_RECORDED",
          system: "MERCHANT_LEDGER",
          status: rf.status === "processed" ? "SUCCESS" : "PENDING",
          details: `Refund ID ${rf.id} recorded with status ${rf.status}.`,
        });
      }
    } else {
      eventTrail.push({
        id: `evt_wh_dispatch_${p.id}`,
        timestamp: new Date().toISOString(),
        event_type: "WEBHOOK_DISPATCH",
        system: "WEBHOOK_DISPATCHER",
        status: "TIMEOUT",
        details: "Downstream merchant webhook acknowledgment timed out or missing.",
      });
    }

    const evidence: EvidencePackage = {
      gateway_status: p.status === "captured" ? "ACKNOWLEDGED" : p.status === "authorized" ? "PENDING" : "FAILED",
      bank_status: p.status === "captured" ? "CREDIT_CONFIRMED" : p.status === "failed" ? "REJECTED" : "PENDING_SWITCH",
      webhook_status: refunds.length > 0 ? "DELIVERED" : "FAILED_TIMEOUT",
      destination_status: "VALID_ACTIVE",
      ledger_status: p.refund_status === "full" ? "REFUNDED" : "MISMATCH_PENDING",
      event_trail: eventTrail,
      age_days: ageDays,
      amount: amountInRupees,
      currency: p.currency || "INR",
      has_conflicting_signals: p.status === "captured" && p.refund_status !== "full",
      conflict_summary: `Payment ${p.id} is captured at Razorpay, but settlement/webhook state remains in unresolved sync.`,
    };

    const caseId = `rc_${p.id.replace("pay_", "")}`;
    const refundId = refunds[0]?.id || `rfnd_live_${p.id.slice(-8)}`;

    const newCase: RefundCase = {
      case_id: caseId,
      refund_id: refundId,
      workspace_id: workspace.id,
      amount: amountInRupees,
      currency: p.currency || "INR",
      created_at: paymentCreatedAt,
      updated_at: new Date().toISOString(),
      merchant_id: (p.notes as any)?.merchant_id || `m_${workspace.id.slice(-6)}`,
      merchant_name: workspace.name,
      customer_id: p.customer_id || `cust_${p.id.slice(-6)}`,
      customer_name: (p.notes as any)?.customer_name || p.contact || "Razorpay Customer",
      customer_vpa_or_account: p.vpa || p.email || p.contact || "customer@bank",
      current_status: p.refund_status === "full" ? "RESOLVED" : "LIMBO",
      failure_class: failureClass,
      is_planted_failure: false,
      remediation_attempts: 0,
      age_days: ageDays,
      evidence,
    };

    Database.createCase(newCase);

    Database.addAuditLog({
      workspace_id: workspace.id,
      case_id: newCase.case_id,
      actor: user.name || "OPERATOR",
      stage: "DETECT",
      action: "PAYMENT_LOOKUP",
      provider: p.id.startsWith("pay_") ? "RAZORPAY_TEST" : "RAZORPAY_LIVE",
      message: `Retrieved live Razorpay payment ${p.id} (₹${amountInRupees}) into investigation queue.`,
      status: "INFO",
      details: {
        payment_id: p.id,
        status: p.status,
        amount: amountInRupees,
        method: p.method,
        refunds_count: refunds.length,
      },
    });

    return NextResponse.json({
      success: true,
      case: newCase,
      source: "Razorpay " + (p.id.startsWith("pay_") ? "Test" : "Live") + " Mode",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to investigate payment." },
      { status: 500 }
    );
  }
}
