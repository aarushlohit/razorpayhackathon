import { NextResponse } from "next/server";
import { RefundStore } from "@/lib/simulator/store";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: RefundStore.getConfig(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = RefundStore.updateConfig(body);
    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
