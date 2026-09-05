"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/settings/integrations");
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.data.integrations);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id }),
      });
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [id]: data.message || (data.success ? "Connection healthy" : "Connection failed"),
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Integrations & Connectors</h1>
        <p className="text-[14px] text-[#6E6E73] mt-1">
          Direct status of payment gateways, external AI engines, and backend database connections.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5E7] rounded-2xl divide-y divide-[#E5E5E7] shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-[#86868B]">
            Loading integration statuses...
          </div>
        ) : (
          integrations.map((item) => (
            <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#000000] text-sm">{item.name}</span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full border ${
                      item.status === "CONNECTED"
                        ? "border-[#E5E5E7] bg-[#F5F5F7] text-[#000000] font-semibold"
                        : "border-[#E5E5E7] text-[#86868B]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73]">{item.description}</p>
                {testResult[item.id] && (
                  <p className="text-xs text-[#000000] font-mono pt-1">
                    ↳ {testResult[item.id]}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleTestConnection(item.id)}
                disabled={testingId === item.id}
                className="text-xs px-4 py-2 border border-[#E5E5E7] bg-white rounded-full text-[#1D1D1F] hover:border-[#000000] hover:bg-[#F5F5F7] transition disabled:opacity-50 font-medium shrink-0"
              >
                {testingId === item.id ? "Testing..." : "Test connection"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
