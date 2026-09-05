import { NextResponse } from "next/server";
import { Database } from "@/lib/db";
import { verifyPassword, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required." }, { status: 400 });
    }

    const user = Database.getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    const workspaces = Database.getAllWorkspaces();
    const defaultWs = workspaces[0] || Database.createWorkspace({
      id: "ws_default",
      name: "Default Workspace",
      slug: "default",
      provider: "sandbox",
      autonomy_mode: "APPROVAL_REQUIRED",
      confidence_threshold: 0.85,
      high_value_limit: 50000,
      max_attempts: 1,
      allowed_actions: ["resend_webhook", "reconcile_state", "refresh_status", "verify_refund"],
    });

    const session = Database.createSession(user.id, defaultWs.id);

    const res = NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name }, workspace: defaultWs },
    });

    res.cookies.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
