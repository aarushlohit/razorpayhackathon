import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Database } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      Database.deleteSession(token);
    }
    const res = NextResponse.json({ success: true, message: "Logged out." });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
