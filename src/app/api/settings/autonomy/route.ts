import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET() {
  try {
    const { workspace } = await requireAuth();
    return NextResponse.json({
      success: true,
      data: {
        autonomy_mode: workspace.autonomy_mode,
        confidence_threshold: workspace.confidence_threshold,
        high_value_limit: workspace.high_value_limit,
        max_attempts: workspace.max_attempts,
        allowed_actions: workspace.allowed_actions,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const body = await req.json();

    const updated = Database.updateWorkspace(workspace.id, {
      ...(body.autonomy_mode ? { autonomy_mode: body.autonomy_mode } : {}),
      ...(body.confidence_threshold !== undefined ? { confidence_threshold: Number(body.confidence_threshold) } : {}),
      ...(body.high_value_limit !== undefined ? { high_value_limit: Number(body.high_value_limit) } : {}),
      ...(body.max_attempts !== undefined ? { max_attempts: Number(body.max_attempts) } : {}),
      ...(body.allowed_actions ? { allowed_actions: body.allowed_actions } : {}),
    });

    Database.addAuditLog({
      workspace_id: workspace.id,
      case_id: "SYSTEM",
      actor: "HUMAN_OPERATOR",
      stage: "POLICY_GATE",
      action: "AUTONOMY_POLICY_UPDATED",
      provider: updated.provider,
      message: `Autonomy policies updated: Mode=${updated.autonomy_mode}, Cutoff=${(updated.confidence_threshold * 100).toFixed(0)}%, MaxVal=₹${updated.high_value_limit}.`,
      status: "INFO",
      details: body,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
