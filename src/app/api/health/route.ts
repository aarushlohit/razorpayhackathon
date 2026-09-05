import { NextResponse } from "next/server";

// Safe env diagnostic — NEVER prints values, only presence
export async function GET() {
  const keys = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NVIDIA_API_KEY: !!(process.env.NVIDIA_API_KEY || process.env.NIM_API_KEY),
    OPENCODE_API_KEY: !!process.env.OPENCODE_API_KEY,
    RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const providers = {
    gemini: keys.GEMINI_API_KEY ? "CONFIGURED" : "MISSING",
    nvidia: keys.NVIDIA_API_KEY ? "CONFIGURED" : "MISSING",
    opencode: keys.OPENCODE_API_KEY ? "CONFIGURED" : "MISSING",
  };

  const integrations = {
    razorpay: keys.RAZORPAY_KEY_ID && keys.RAZORPAY_KEY_SECRET ? "CONFIGURED" : "MISSING",
    supabase: keys.NEXT_PUBLIC_SUPABASE_URL ? "CONFIGURED" : "NOT_CONNECTED (using local DB)",
  };

  const ready = keys.GEMINI_API_KEY || keys.NVIDIA_API_KEY || keys.OPENCODE_API_KEY;

  return NextResponse.json({
    success: true,
    data: {
      ai_ready: ready,
      providers,
      integrations,
      database: "LOCAL_JSON_DB (workspace-isolated, cryptographic audit chain)",
      note: "Secret values are never returned. Only PRESENT/MISSING status.",
    },
  });
}
