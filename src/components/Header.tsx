"use client";

import React, { useState } from "react";
import { Play, SkipForward, RefreshCw, Sliders, Shield, Sparkles, Terminal } from "lucide-react";

interface HeaderProps {
  seed: number;
  difficulty: "easy" | "normal" | "ambiguous";
  isRunningBatch: boolean;
  isStepping: boolean;
  onRunBatch: () => void;
  onStepNext: () => void;
  onRegenerate: (newSeed: number, newDifficulty: "easy" | "normal" | "ambiguous") => void;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  seed,
  difficulty,
  isRunningBatch,
  isStepping,
  onRunBatch,
  onStepNext,
  onRegenerate,
  onOpenSettings,
  onOpenAudit,
}) => {
  const [localSeed, setLocalSeed] = useState(seed.toString());
  const [localDiff, setLocalDiff] = useState(difficulty);

  const handleRegenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(localSeed, 10);
    onRegenerate(isNaN(parsed) ? 12345 : parsed, localDiff);
  };

  return (
    <header className="border-b border-slate-800 bg-[#080d1a]/95 backdrop-blur sticky top-0 z-30">
      {/* Honesty Requirement Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 px-4 py-1.5 border-b border-blue-900/40 text-[11px] font-mono flex items-center justify-between text-blue-300">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            SIMULATED PAYMENT OPERATIONS ENVIRONMENT
          </span>
          <span className="text-slate-400 hidden sm:inline">
            All transaction data, telemetry logs, and ₹ recovery values are synthetic.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
            RAZORPAY AI BUILDATHON 2026 • AI REVENUE RECOVERY
          </span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-[1700px] mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                REFUND LOOP CLOSER
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v1.0 AGENT
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              &ldquo;Don&apos;t tell merchants a refund is stuck. <span className="text-blue-400 font-medium">Unstick it.</span>&rdquo;
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seed & Difficulty Regenerator */}
          <form onSubmit={handleRegenerate} className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 font-mono">Seed:</span>
            <input
              type="text"
              value={localSeed}
              onChange={(e) => setLocalSeed(e.target.value)}
              className="w-16 bg-slate-950 text-slate-200 px-1.5 py-1 rounded border border-slate-800 font-mono text-center focus:outline-none focus:border-blue-500 text-xs"
              placeholder="12345"
            />
            <select
              value={localDiff}
              onChange={(e) => setLocalDiff(e.target.value as any)}
              className="ml-1 bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="easy">Easy (Unambiguous)</option>
              <option value="normal">Normal (Realistic)</option>
              <option value="ambiguous">Ambiguous (Conflict Heavy)</option>
            </select>
            <button
              type="submit"
              title="Regenerate synthetic dataset with this seed"
              className="ml-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Regen</span>
            </button>
          </form>

          {/* Primary Agent CTAs */}
          <button
            onClick={onStepNext}
            disabled={isStepping || isRunningBatch}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <SkipForward className={`w-3.5 h-3.5 ${isStepping ? "animate-pulse text-blue-400" : ""}`} />
            <span>{isStepping ? "Stepping..." : "Step Next Case"}</span>
          </button>

          <button
            onClick={onRunBatch}
            disabled={isRunningBatch || isStepping}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 border border-blue-400/30 transition"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunningBatch ? "animate-spin" : ""}`} />
            <span>{isRunningBatch ? "Processing Batch..." : "RUN AGENT (Batch)"}</span>
          </button>

          {/* Utilities */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Configure Safety Thresholds & AI Model"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAudit}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="View Full Immutable Audit Log"
          >
            <Terminal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
