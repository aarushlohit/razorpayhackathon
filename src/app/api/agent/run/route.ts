import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";
import { runAgentLoopForCase, LoopExecutionResult } from "@/lib/agent/loop-orchestrator";

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 10, 25);
    const apiKeyOverride = body.apiKeyOverride;

    const cases = Database.getCases(workspace.id);
    const limbo = cases.filter((c) => c.current_status === "LIMBO").slice(0, limit);

    if (limbo.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending limbo cases in queue.",
        data: { processed: 0, totalRecovered: 0, results: [] },
      });
    }

    const results: LoopExecutionResult[] = [];
    let totalRecovered = 0;

    for (const c of limbo) {
      const res = await runAgentLoopForCase(workspace.id, c.case_id, apiKeyOverride);
      results.push(res);
      totalRecovered += res.value_recovered;
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        totalRecovered,
        results,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
