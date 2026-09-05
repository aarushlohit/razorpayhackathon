import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { workspace } = await requireAuth();
    const { id } = await params;
    const refundCase = Database.getCase(workspace.id, id);

    if (!refundCase) {
      return NextResponse.json({ success: false, error: "Case not found." }, { status: 404 });
    }

    const auditTrail = Database.getAuditLogs(workspace.id, 100).filter(
      (l) => l.case_id === refundCase.case_id
    );

    return NextResponse.json({
      success: true,
      data: {
        case: refundCase,
        auditTrail,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
