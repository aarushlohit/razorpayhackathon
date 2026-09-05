import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature, parseWebhookEvent } from "@/lib/razorpay/webhooks";
import { Database } from "@/lib/db";
import { decryptSecret } from "@/lib/security/encryption";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-razorpay-signature");
    const rawBody = await req.text();

    const event = parseWebhookEvent(rawBody);
    if (!event) {
      return NextResponse.json({ success: false, error: "Malformed webhook payload." }, { status: 400 });
    }

    // Resolve target workspace by matching configured webhook secrets
    const allWorkspaces = Database.getAllWorkspaces();
    let matchedWorkspaceId: string | null = null;
    let signatureVerified = false;

    // 1. Iterate through workspace integrations
    for (const ws of allWorkspaces) {
      const integration = Database.getIntegration(ws.id, "razorpay");
      if (integration?.encrypted_webhook_secret) {
        try {
          const decryptedSecret = decryptSecret(integration.encrypted_webhook_secret);
          if (signature && verifyRazorpayWebhookSignature(rawBody, signature, decryptedSecret)) {
            matchedWorkspaceId = ws.id;
            signatureVerified = true;
            break;
          }
        } catch {
          // Continue searching
        }
      }
    }

    // 2. Fallback to environment webhook secret if configured
    if (!matchedWorkspaceId && process.env.RAZORPAY_WEBHOOK_SECRET) {
      if (signature && verifyRazorpayWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
        matchedWorkspaceId = allWorkspaces[0]?.id || "ws_razorpay_demo";
        signatureVerified = true;
      } else {
        return NextResponse.json(
          { success: false, error: "Invalid cryptographic webhook signature." },
          { status: 401 }
        );
      }
    }

    // If signature was provided but could not be verified against any workspace integration
    if (signature && !signatureVerified) {
      return NextResponse.json(
        { success: false, error: "Cryptographic signature failed verification against all workspace integrations." },
        { status: 401 }
      );
    }

    const targetWorkspaceId = matchedWorkspaceId || allWorkspaces[0]?.id || "ws_razorpay_demo";
    const eventId = `wh_${event.created_at}_${event.event}`;
    const refundData = event.payload?.refund?.entity;
    const paymentData = event.payload?.payment?.entity;

    // Log the webhook in the tamper-evident audit ledger with resolved workspace_id
    Database.addAuditLog({
      workspace_id: targetWorkspaceId,
      case_id: refundData?.id || paymentData?.id || "WEBHOOK_EVENT",
      actor: "RAZORPAY_WEBHOOK",
      stage: "DETECT",
      action: event.event,
      provider: "RAZORPAY_WEBHOOK",
      message: `Webhook received: ${event.event} for payment ${paymentData?.id || "N/A"} (Refund: ${refundData?.id || "N/A"}).`,
      status: "INFO",
      details: {
        event_id: eventId,
        payment_id: paymentData?.id,
        refund_id: refundData?.id,
        amount: (refundData?.amount || paymentData?.amount || 0) / 100,
        signature_verified: signatureVerified,
      },
    });

    return NextResponse.json({
      success: true,
      received: true,
      event_id: eventId,
      workspace_id: targetWorkspaceId,
      signature_verified: signatureVerified,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Webhook processing error." },
      { status: 500 }
    );
  }
}
