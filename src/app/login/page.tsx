"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Sparkles, Shield, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }
      router.push("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setEmail("demo@razorpay.com");
    setPassword("Password123!");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@razorpay.com", password: "Password123!" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Demo login failed");
      }
      router.push("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col justify-center py-16 px-6 sm:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block mb-6">
          <span className="font-semibold text-base tracking-tight text-[#000000]">REFUND LOOP</span>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight text-[#000000]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-[#6E6E73]">
          Sign in to your workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E5E5E7] py-8 px-6 rounded-2xl sm:px-8 shadow-sm space-y-5">
          {/* Quick Demo Access Bar */}
          <div className="bg-[#F5F5F7] border border-[#E5E5E7] p-3.5 rounded-xl text-center">
            <div className="text-[11px] font-mono font-medium text-[#1D1D1F] mb-1">
              DEMO / EVALUATION ACCESS
            </div>
            <p className="text-[12px] text-[#6E6E73] mb-2.5">
              Enter directly as Razorpay Enterprise Admin:
            </p>
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={loading}
              className="w-full py-2 bg-[#000000] hover:bg-[#1D1D1F] text-white font-medium text-[13px] rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <span>1-Click Demo Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#000000] text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[13px] font-medium text-[#1D1D1F]">Password</label>
                <a href="#forgot" className="text-[12px] text-[#6E6E73] hover:text-[#000000]">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#000000] text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="keep-signed-in"
                defaultChecked
                className="w-4 h-4 rounded border-[#E5E5E7] text-[#000000] focus:ring-0"
              />
              <label htmlFor="keep-signed-in" className="text-[12px] text-[#6E6E73]">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#000000] hover:bg-[#1D1D1F] text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          <div className="text-center text-xs text-[#6E6E73] pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#000000] font-medium hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
