import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const { name, provider, volume, autonomy_mode } = await req.json();

    const updated = Database.updateWorkspace(workspace.id, {
      ...(name ? { name } : {}),
      ...(provider ? { provider } : {}),
      ...(autonomy_mode ? { autonomy_mode } : {}),
    });

    Database.addAuditLog({
      workspace_id: workspace.id,
      case_id: "SYSTEM",
      actor: "HUMAN_OPERATOR",
      stage: "DETECT",
      action: "WORKSPACE_ONBOARDING_COMPLETED",
      provider: updated.provider,
      message: `Onboarding completed. Provider set to ${updated.provider}, Autonomy mode set to ${updated.autonomy_mode}.`,
      status: "INFO",
      details: { volume },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
