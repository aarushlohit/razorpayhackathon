import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";
import { maskKeyId } from "@/lib/security/encryption";
import type { PublicIntegrationStatus } from "@/types";

export async function GET() {
  try {
    const { workspace } = await requireAuth();
    const integration = Database.getIntegration(workspace.id, "razorpay");

    const capabilities = [
      "payment_lookup",
      "refund_lookup",
      "refund_creation",
      "webhook_verification",
    ];

    if (!integration) {
      // Check if fallback environment variable exists
      const envKeyId = process.env.RAZORPAY_KEY_ID;
      const envConfigured = Boolean(envKeyId && process.env.RAZORPAY_KEY_SECRET);

      const status: PublicIntegrationStatus = {
        connected: envConfigured,
        provider: "razorpay",
        mode: envConfigured ? (envKeyId?.startsWith("rzp_live") ? "live" : "test") : null,
        status: envConfigured ? "connected" : "not_connected",
        key_id_masked: envConfigured ? maskKeyId(envKeyId!) : null,
        has_webhook_secret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
        last_validated_at: null,
        capabilities,
      };

      return NextResponse.json({ success: true, data: status });
    }

    const status: PublicIntegrationStatus = {
      connected: integration.status === "connected",
      provider: "razorpay",
      mode: integration.mode,
      status: integration.status,
      key_id_masked: maskKeyId(integration.key_id),
      has_webhook_secret: Boolean(integration.encrypted_webhook_secret),
      last_validated_at: integration.last_validated_at,
      capabilities,
    };

    return NextResponse.json({ success: true, data: status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to fetch integration status." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { user, workspace } = await requireAuth();

    const deleted = Database.deleteIntegration(workspace.id, "razorpay");

    // Update workspace provider back to sandbox
    Database.updateWorkspace(workspace.id, {
      provider: "sandbox",
    });

    Database.addAuditLog({
      workspace_id: workspace.id,
      case_id: "INTEGRATION_SETTINGS",
      actor: user.name || "OPERATOR",
      stage: "ACT",
      action: "RAZORPAY_DISCONNECTED",
      provider: "RAZORPAY",
      message: `Razorpay integration disconnected and encrypted credentials revoked from Refund Loop by ${user.name}.`,
      status: "INFO",
    });

    return NextResponse.json({
      success: true,
      message: "Removed from Refund Loop.",
      disconnected: deleted,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to disconnect Razorpay." }, { status: 500 });
  }
}
