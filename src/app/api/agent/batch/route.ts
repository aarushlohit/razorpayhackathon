import { NextResponse } from "next/server";
import { RefundStore } from "@/lib/simulator/store";
import { runAgentLoopForCase, LoopExecutionResult } from "@/lib/agent/loop-orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 10, 30);
    const apiKeyOverride = body.apiKeyOverride;

    const all = RefundStore.getAllCases();
    const limboCases = all.filter((c) => c.current_status === "LIMBO").slice(0, limit);

    if (limboCases.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No cases in limbo to process.",
        data: { processed: 0, results: [] },
      });
    }

    const results: LoopExecutionResult[] = [];
    let totalRecovered = 0;

    for (const c of limboCases) {
      const res = await runAgentLoopForCase(c.case_id, apiKeyOverride);
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
