"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, workspaceName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Signup failed");
      }
      router.push("/onboarding");
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
          Create your account
        </h2>
        <p className="mt-1.5 text-sm text-[#6E6E73]">
          Start automating post-payment operations today.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-[#E5E5E7] py-8 px-6 rounded-2xl sm:px-8 shadow-sm space-y-4">
          <form className="space-y-4" onSubmit={handleSignup}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarush Verma"
                className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#000000] text-sm"
              />
            </div>

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
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Company / Workspace name</label>
              <input
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Acme Pvt. Ltd."
                className="w-full bg-white border border-[#E5E5E7] rounded-lg p-2.5 text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#000000] text-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">Password</label>
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
                id="terms"
                required
                defaultChecked
                className="w-4 h-4 rounded border-[#E5E5E7] text-[#000000] focus:ring-0"
              />
              <label htmlFor="terms" className="text-[12px] text-[#6E6E73]">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#000000] hover:bg-[#1D1D1F] text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <div className="text-center text-xs text-[#6E6E73] pt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-[#000000] font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
