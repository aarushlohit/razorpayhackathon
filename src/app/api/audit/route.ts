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

    const integrity = Database.verifyAuditIntegrity(workspace.id);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        integrity,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const body = await req.json().catch(() => ({}));

    if (body.action === "VERIFY_INTEGRITY") {
      const integrity = Database.verifyAuditIntegrity(workspace.id);
      return NextResponse.json({
        success: true,
        data: {
          status: integrity.valid ? "AUDIT_INTEGRITY_VALID" : "AUDIT_INTEGRITY_COMPROMISED",
          count: integrity.count,
          error: integrity.error,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
