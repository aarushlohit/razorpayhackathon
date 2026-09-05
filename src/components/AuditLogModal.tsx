"use client";

import React, { useState, useMemo } from "react";
import { X, Terminal, Search, Download, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { AuditLogEntry } from "@/types";

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, logs }) => {
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filterStage !== "ALL" && l.stage !== filterStage) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.case_id.toLowerCase().includes(q) ||
          l.message.toLowerCase().includes(q) ||
          l.stage.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filterStage, search]);

  if (!isOpen) return null;

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `refund_loop_closer_audit_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Immutable Audit Log</h3>
              <p className="text-[11px] text-slate-400">
                End-to-end ledger recording every agent investigation, policy check, mock action, and outcome verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadJSON}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 transition"
              title="Download full JSON audit log"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto">
            {["ALL", "DETECT", "INVESTIGATE", "DIAGNOSE", "POLICY_GATE", "ACT", "VERIFY", "OUTCOME"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setFilterStage(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                    filterStage === st
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52 font-mono"
            />
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit log entries matching filters.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col gap-1 text-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">
                      {new Date(log.timestamp).toISOString()}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-200 font-bold">
                      {log.stage}
                    </span>
                    {log.case_id !== "SYSTEM" && (
                      <span className="text-blue-400 font-semibold">{log.case_id}</span>
                    )}
                  </div>
                  <div>
                    {log.status === "SUCCESS" && (
                      <span className="text-emerald-400 text-[10px] font-bold">SUCCESS</span>
                    )}
                    {log.status === "WARNING" && (
                      <span className="text-amber-400 text-[10px] font-bold">WARNING</span>
                    )}
                    {log.status === "FAILURE" && (
                      <span className="text-rose-400 text-[10px] font-bold">FAILED</span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-200 font-sans">{log.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
