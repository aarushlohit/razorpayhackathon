import { NextResponse } from "next/server";
import { Database } from "@/lib/db";
import { generateSalt, hashPassword, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, name, workspaceName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required." }, { status: 400 });
    }

    const existing = Database.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ success: false, error: "Account with this email already exists." }, { status: 400 });
    }

    const salt = generateSalt();
    const password_hash = hashPassword(password, salt);

    const user = Database.createUser({
      email,
      name: name || email.split("@")[0],
      role: "admin",
      password_hash,
      salt,
    });

    const wsSlug = (workspaceName || `${user.name}-workspace`).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const workspace = Database.createWorkspace({
      id: `ws_${Date.now()}`,
      name: workspaceName || `${user.name}'s Workspace`,
      slug: wsSlug,
      provider: "sandbox",
      autonomy_mode: "APPROVAL_REQUIRED",
      confidence_threshold: 0.85,
      high_value_limit: 50000,
      max_attempts: 1,
      allowed_actions: ["resend_webhook", "reconcile_state", "refresh_status", "verify_refund"],
    });

    // Seed sample cases for this new workspace
    Database.regenerateSandboxDataset(workspace.id, Math.floor(Math.random() * 89999 + 10000), "normal", 50);

    const session = Database.createSession(user.id, workspace.id);

    const res = NextResponse.json({
      success: true,
      data: { user: { id: user.id, email: user.email, name: user.name }, workspace },
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
