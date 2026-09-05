"use client";

import React, { useEffect, useState } from "react";
import { Layers, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setIntegrations(res.data.integrations);
        }
      });
  }, []);

  const handleTest = async (provider: string) => {
    setTesting(provider);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResult({ provider, ...data });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Payment & AI Integrations</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Server-side provider connections. Secret API keys are never exposed to the client.
        </p>
      </div>

      {testResult && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/40 text-xs text-slate-200">
          <strong className="text-blue-400 uppercase font-mono">{testResult.provider}:</strong> {testResult.message}
        </div>
      )}

      <div className="space-y-3">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-white">{item.name}</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                    item.status === "CONNECTED"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : item.status === "SANDBOX_MOCK"
                      ? "bg-amber-950 text-amber-300 border-amber-800"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{item.description}</p>
            </div>

            <button
              onClick={() => handleTest(item.id)}
              disabled={testing === item.id}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition self-start sm:self-auto shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${testing === item.id ? "animate-spin" : ""}`} />
              <span>{testing === item.id ? "Testing..." : "Test Connection"}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
