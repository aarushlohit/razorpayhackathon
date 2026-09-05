"use client";

import React, { useEffect, useState } from "react";
import { Database, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SandboxSettingsPage() {
  const [seed, setSeed] = useState(12345);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "ambiguous">("normal");
  const [count, setCount] = useState(300);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings/sandbox")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSeed(res.data.seed);
          setDifficulty(res.data.difficulty);
          setCount(res.data.count);
        }
      });
  }, []);

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/settings/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: Number(seed), difficulty, count: Number(count) }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`Dataset regenerated with seed ${seed} and difficulty '${difficulty}' (${count} cases).`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5E7] mb-2">
          DEVELOPER SANDBOX ENVIRONMENT
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#000000]">Sandbox & Synthetic Simulator</h1>
        <p className="text-xs text-[#6E6E73] mt-0.5">
          Judge-Proofing controls: Regenerate synthetic datasets with fixed seeds and adjust cross-system conflict difficulty.
        </p>
      </div>

      <form onSubmit={handleRegenerate} className="p-6 rounded-2xl bg-white border border-[#E5E5E7] shadow-2xs space-y-4 text-xs">
        {status && (
          <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#E5E5E7] text-[#1D1D1F] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{status}</span>
          </div>
        )}

        <div>
          <label className="block text-[#1D1D1F] font-semibold mb-1">Fixed PRNG Seed</label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="w-full bg-white border border-[#E5E5E7] rounded-xl p-2.5 text-xs text-[#000000] font-mono focus:outline-none focus:border-blue-500"
          />
          <p className="text-[11px] text-[#6E6E73] mt-1">
            Judges can change this seed to verify that case distributions, merchant names, amounts, and planted failures change systematically.
          </p>
        </div>

        <div>
          <label className="block text-[#1D1D1F] font-semibold mb-1">Telemetry Conflict Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
            className="w-full bg-white border border-[#E5E5E7] rounded-xl p-2.5 text-xs text-[#000000] focus:outline-none focus:border-blue-500"
          >
            <option value="easy">Easy (Clear, Unambiguous Telemetry signals)</option>
            <option value="normal">Normal (Realistic distributed retry noise)</option>
            <option value="ambiguous">Ambiguous (Severe cross-system contradictions)</option>
          </select>
        </div>

        <div>
          <label className="block text-[#1D1D1F] font-semibold mb-1">Dataset Case Count</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full bg-white border border-[#E5E5E7] rounded-xl p-2.5 text-xs text-[#000000] font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5E5E7] text-[11px] text-[#6E6E73] space-y-1">
          <div className="text-[#000000] font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#1D1D1F]" />
            Guaranteed Planted Failure Case
          </div>
          <div>
            Every generated batch includes exactly one randomly planted case where the AI diagnosis is plausible, but the underlying bank switch rejects retry (`STILL_PENDING`), proving the closed-loop verification catch.
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[#1D1D1F] hover:bg-[#000000] text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Regenerating..." : "Regenerate Sandbox Dataset"}</span>
        </button>
      </form>
    </div>
  );
}
