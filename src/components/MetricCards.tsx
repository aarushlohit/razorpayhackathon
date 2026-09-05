"use client";

import React from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, ArrowUpRight, Clock, IndianRupee } from "lucide-react";

interface MetricsProps {
  metrics: {
    totalCases: number;
    limboCount: number;
    resolvedCount: number;
    escalatedCount: number;
    totalValueLimbo: number;
    totalValueRecovered: number;
    successRate: number;
    averageAgeDays: number;
  };
}

export const MetricCards: React.FC<MetricsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Refunds in Limbo */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Stuck in Limbo</span>
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-slate-100 font-mono">
            {metrics.limboCount}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {metrics.totalCases}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            {metrics.averageAgeDays}d avg age
          </div>
        </div>
      </div>

      {/* 2. Value in Limbo */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Simulated Limbo Value</span>
          <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-amber-400 font-mono">
            ₹{(metrics.totalValueLimbo / 100000).toFixed(2)}L
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ₹{metrics.totalValueLimbo.toLocaleString("en-IN")} at risk
          </div>
        </div>
      </div>

      {/* 3. Value Recovered */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-3.5 flex flex-col justify-between hover:border-emerald-700/60 transition relative overflow-hidden">
        <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
          <span>Simulated Recovered</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-emerald-400 font-mono flex items-baseline gap-1">
            <span>₹{(metrics.totalValueRecovered / 100000).toFixed(2)}L</span>
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">
            ₹{metrics.totalValueRecovered.toLocaleString("en-IN")} recovered
          </div>
        </div>
      </div>

      {/* 4. Closed / Resolved */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Closed Autonomous</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {metrics.resolvedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Verified processed
          </div>
        </div>
      </div>

      {/* 5. Escalated to Human */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Escalated (Safe Gate)</span>
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-rose-400 font-mono">
            {metrics.escalatedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Low conf / high value / failed
          </div>
        </div>
      </div>

      {/* 6. Success Rate */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Autonomous Accuracy</span>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-blue-400 font-mono">
            {metrics.successRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Safe resolution rate
          </div>
        </div>
      </div>
    </div>
  );
};
