import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";
import { runAgentLoopForCase } from "@/lib/agent/loop-orchestrator";

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const body = await req.json().catch(() => ({}));
    let caseId = body.case_id;
    const provider = body.provider;
    const apiKeyOverride = body.apiKeyOverride || (provider ? { provider } : undefined);

    if (!caseId) {
      const cases = Database.getCases(workspace.id);
      const firstLimbo = cases.find((c) => c.current_status === "LIMBO");
      if (!firstLimbo) {
        return NextResponse.json({
          success: false,
          message: "No stuck refunds currently pending investigation.",
        });
      }
      caseId = firstLimbo.case_id;
    }

    const result = await runAgentLoopForCase(workspace.id, caseId, apiKeyOverride);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
