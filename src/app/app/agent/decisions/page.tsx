"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BrainCircuit, ExternalLink, ShieldCheck, ShieldAlert, Sparkles, Search } from "lucide-react";

export default function AgentDecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/decisions")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setDecisions(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = decisions.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.case_id.toLowerCase().includes(q) ||
      d.diagnosis.likely_stage.toLowerCase().includes(q) ||
      d.merchant_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Agent Decisions Ledger</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Inspect raw structured AI model diagnoses, confidence metrics, and evidence citations.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <span className="text-xs text-slate-400 font-mono">
            Total Diagnostic Evaluations: <strong>{decisions.length}</strong>
          </span>
          <input
            type="text"
            placeholder="Search decisions by case or stage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64 font-mono"
          />
        </div>

        <div className="overflow-x-auto min-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">CASE</th>
                <th className="py-3 px-4 font-semibold">DIAGNOSIS</th>
                <th className="py-3 px-4 font-semibold">CONFIDENCE</th>
                <th className="py-3 px-4 font-semibold">RECOMMENDED ACTION</th>
                <th className="py-3 px-4 font-semibold">POLICY GATE</th>
                <th className="py-3 px-4 font-semibold">AI MODEL</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((d) => (
                <tr key={d.case_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-200">
                    <Link href={`/app/recovery/${d.case_id}`} className="hover:text-blue-400">
                      {d.case_id}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200 capitalize">
                    {d.diagnosis.likely_stage.replace(/_/g, " ")}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        d.diagnosis.confidence >= 0.85
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}
                    >
                      {(d.diagnosis.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-blue-400">
                    {d.diagnosis.recommended_action}()
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {d.policy?.allowed ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" /> Blocked
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {d.diagnosis.provider}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/app/recovery/${d.case_id}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No AI decisions recorded yet. Run the recovery agent to generate diagnostic outputs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
