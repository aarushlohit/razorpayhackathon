import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature, parseWebhookEvent } from "@/lib/razorpay/webhooks";
import { Database } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const rawBody = await req.text();

    if (secret) {
      if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature, secret)) {
        return NextResponse.json(
          { success: false, error: "Invalid cryptographic webhook signature." },
          { status: 401 }
        );
      }
    }

    const event = parseWebhookEvent(rawBody);
    if (!event) {
      return NextResponse.json({ success: false, error: "Malformed webhook payload." }, { status: 400 });
    }

    const eventId = `wh_${event.created_at}_${event.event}`;
    const refundData = event.payload?.refund?.entity;
    const paymentData = event.payload?.payment?.entity;

    // Log the webhook in the tamper-evident audit ledger
    Database.addAuditLog({
      workspace_id: "ws_default",
      case_id: refundData?.id || paymentData?.id || "WEBHOOK_EVENT",
      actor: "RAZORPAY_WEBHOOK",
      stage: "DETECT",
      action: event.event,
      provider: "RAZORPAY_LIVE",
      message: `Webhook received: ${event.event} for payment ${paymentData?.id || "N/A"} (Refund: ${refundData?.id || "N/A"}).`,
      status: "INFO",
      details: event,
    });

    return NextResponse.json({
      success: true,
      received: true,
      event_id: eventId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Webhook processing error." },
      { status: 500 }
    );
  }
}
