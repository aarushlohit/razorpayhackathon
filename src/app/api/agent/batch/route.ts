import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";
import { runAgentLoopForCase, LoopExecutionResult } from "@/lib/agent/loop-orchestrator";

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 10, 30);
    const apiKeyOverride = body.apiKeyOverride;

    const all = Database.getCases(workspace.id);
    const limboCases = all.filter((c) => c.current_status === "LIMBO").slice(0, limit);

    if (limboCases.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No cases in limbo to process.",
        data: { processed: 0, results: [] },
      });
    }

    const results: LoopExecutionResult[] = [];
    let totalResolved = 0;

    for (const c of limboCases) {
      const res = await runAgentLoopForCase(workspace.id, c.case_id, apiKeyOverride);
      results.push(res);
      totalResolved += res.value_resolved;
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        totalResolved,
        results,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
