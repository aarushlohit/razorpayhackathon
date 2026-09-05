import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("case_id");

    let logs = Database.getAuditLogs(workspace.id, 500);
    if (caseId) {
      logs = logs.filter((l) => l.case_id === caseId);
    }

    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
