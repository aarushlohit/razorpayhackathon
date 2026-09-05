import { NextResponse } from "next/server";
import { RefundStore } from "@/lib/simulator/store";

export async function GET() {
  const logs = RefundStore.getAuditLog();
  return NextResponse.json({
    success: true,
    data: logs,
  });
}
