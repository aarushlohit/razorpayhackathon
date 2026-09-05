import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";
import { RazorpayClient } from "@/lib/razorpay/client";
import { encryptSecret } from "@/lib/security/encryption";
import type { IntegrationMode, WorkspaceIntegration } from "@/types";

export async function POST(req: Request) {
  try {
    const { user, workspace } = await requireAuth();
    const body = await req.json();

    const {
      mode = "test",
      key_id,
      key_secret,
      webhook_secret,
      save = true,
    } = body;

    if (!key_id || typeof key_id !== "string" || !key_secret || typeof key_secret !== "string") {
      return NextResponse.json(
        {
          success: false,
          status: "INVALID_CREDENTIALS",
          error: "Key ID and Key Secret are required.",
        },
        { status: 400 }
      );
    }

    const trimmedKeyId = key_id.trim();
    const trimmedKeySecret = key_secret.trim();
    const trimmedWebhookSecret = webhook_secret ? webhook_secret.trim() : "";

    // Real API validation call to api.razorpay.com
    const validation = await RazorpayClient.validateCredentials(trimmedKeyId, trimmedKeySecret);

    if (!validation.valid) {
      // If validation fails and credentials were being updated, update status
      return NextResponse.json(
        {
          success: false,
          status: validation.status,
          error: validation.message,
          mode: validation.mode,
        },
        { status: 400 }
      );
    }

    // Successfully validated
    if (save) {
      const encryptedKeySecret = encryptSecret(trimmedKeySecret);
      const encryptedWebhookSecret = trimmedWebhookSecret
        ? encryptSecret(trimmedWebhookSecret)
        : undefined;

      const integrationRecord: WorkspaceIntegration = {
        id: `int_rzp_${workspace.id}`,
        workspace_id: workspace.id,
        provider: "razorpay",
        mode: (validation.mode as IntegrationMode) || mode,
        key_id: trimmedKeyId,
        encrypted_key_secret: encryptedKeySecret,
        encrypted_webhook_secret: encryptedWebhookSecret,
        status: "connected",
        last_validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      Database.saveIntegration(integrationRecord);

      // Update workspace provider state
      Database.updateWorkspace(workspace.id, {
        provider: validation.mode === "live" ? "razorpay_live" : "sandbox",
      });

      // Tamper-evident audit log
      Database.addAuditLog({
        workspace_id: workspace.id,
        case_id: "INTEGRATION_SETTINGS",
        actor: user.name || "OPERATOR",
        stage: "ACT",
        action: "RAZORPAY_CONNECTED",
        provider: validation.mode === "live" ? "RAZORPAY_LIVE" : "RAZORPAY_TEST",
        message: `Connected Razorpay (${validation.mode.toUpperCase()} MODE) successfully for workspace '${workspace.name}'.`,
        status: "SUCCESS",
        details: {
          mode: validation.mode,
          key_id_prefix: trimmedKeyId.slice(0, 8),
          has_webhook: Boolean(encryptedWebhookSecret),
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: "CONNECTED",
      mode: validation.mode,
      message: validation.message,
      last_validated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, status: "ERROR", error: err?.message || "Internal server error during validation." },
      { status: 500 }
    );
  }
}
