import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    // Return demo user for zero friction if no cookie set
    const demoUser = Database.getUserByEmail("demo@razorpay.com");
    const demoWs = Database.getWorkspace("ws_razorpay_demo");
    if (demoUser && demoWs) {
      return NextResponse.json({
        success: true,
        data: {
          user: { id: demoUser.id, email: demoUser.email, name: demoUser.name, role: demoUser.role },
          workspace: demoWs,
        },
      });
    }
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      user: { id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role },
      workspace: session.workspace,
    },
  });
}
