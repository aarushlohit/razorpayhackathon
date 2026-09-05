import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET() {
  try {
    const { workspace } = await requireAuth();
    const config = Database.getSandboxConfig(workspace.id);
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { workspace } = await requireAuth();
    const { seed, difficulty, count } = await req.json();

    const parsedSeed = seed !== undefined ? Number(seed) : 12345;
    const cases = Database.regenerateSandboxDataset(
      workspace.id,
      parsedSeed,
      difficulty || "normal",
      count || 300
    );

    return NextResponse.json({
      success: true,
      message: `Developer Sandbox regenerated with seed ${parsedSeed} and difficulty '${difficulty || "normal"}'.`,
      data: {
        casesCount: cases.length,
        config: Database.getSandboxConfig(workspace.id),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
