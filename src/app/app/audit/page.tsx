"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, Search, Terminal, Filter, RefreshCw } from "lucide-react";
import { AuditLogEntry } from "@/types";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filterStage !== "ALL" && l.stage !== filterStage) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.case_id.toLowerCase().includes(q) ||
          l.message.toLowerCase().includes(q) ||
          (l.action || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filterStage, search]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund_loop_audit_ledger_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Immutable Audit Ledger</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically timestamped record of every investigation, policy check, mock/test action, and verification.
          </p>
        </div>

        <button
          onClick={exportJSON}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Ledger</span>
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            {["ALL", "DETECT", "INVESTIGATE", "DIAGNOSE", "POLICY_GATE", "ACT", "VERIFY", "OUTCOME"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setFilterStage(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                    filterStage === st
                      ? "bg-blue-600 text-white font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>

          <input
            type="text"
            placeholder="Search audit trail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64 font-mono"
          />
        </div>

        <div className="p-4 space-y-2.5 font-mono text-xs max-h-[600px] overflow-y-auto">
          {filteredLogs.map((l) => (
            <div
              key={l.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex flex-col gap-1 text-slate-300"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{new Date(l.timestamp).toISOString()}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-200">
                    {l.stage}
                  </span>
                  {l.case_id !== "SYSTEM" && (
                    <Link href={`/app/recovery/${l.case_id}`} className="text-blue-400 hover:underline font-bold">
                      {l.case_id}
                    </Link>
                  )}
                  <span className="text-slate-500 text-[10px]">Actor: {l.actor}</span>
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    l.status === "SUCCESS"
                      ? "text-emerald-400"
                      : l.status === "WARNING"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {l.status}
                </span>
              </div>
              <div className="text-slate-200 font-sans text-xs mt-0.5">{l.message}</div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No audit logs match your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
