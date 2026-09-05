import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET() {
  try {
    const { workspace } = await requireAuth();
    const cases = Database.getCases(workspace.id);
    const decisions = cases
      .filter((c) => c.latest_diagnosis)
      .map((c) => ({
        case_id: c.case_id,
        refund_id: c.refund_id,
        amount: c.amount,
        currency: c.currency,
        merchant_name: c.merchant_name,
        diagnosis: c.latest_diagnosis!,
        policy: c.latest_policy,
        status: c.current_status,
        updated_at: c.updated_at,
      }))
      .reverse();

    return NextResponse.json({ success: true, data: decisions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
