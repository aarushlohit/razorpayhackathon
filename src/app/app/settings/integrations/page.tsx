"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Search,
  ExternalLink,
  Zap,
  Check,
  AlertTriangle,
  ArrowRight,
  Server,
  Layers,
} from "lucide-react";
import type { PublicIntegrationStatus } from "@/types";

export default function IntegrationsPage() {
  const [razorpayStatus, setRazorpayStatus] = useState<PublicIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Disconnect state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Real Payment Investigation state
  const [investigatingPaymentId, setInvestigatingPaymentId] = useState("");
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<{
    success: boolean;
    caseId?: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Other AI & Infrastructure integrations status
  const [otherIntegrations, setOtherIntegrations] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const fetchStatus = async () => {
    try {
      setLoading(true);
      // Fetch Razorpay status
      const rzpRes = await fetch("/api/integrations/razorpay");
      const rzpData = await rzpRes.json();
      if (rzpData.success) {
        setRazorpayStatus(rzpData.data);
      }

      // Fetch general integrations
      const genRes = await fetch("/api/settings/integrations");
      const genData = await genRes.json();
      if (genData.success) {
        setOtherIntegrations(
          (genData.data.integrations || []).filter((item: any) => item.id !== "razorpay")
        );
      }
    } catch (err) {
      console.error("Failed to load integrations status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!keyId.trim() || !keySecret.trim()) {
      setFormError("Key ID and Key Secret are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/integrations/razorpay/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          key_id: keyId.trim(),
          key_secret: keySecret.trim(),
          webhook_secret: webhookSecret.trim() || undefined,
          save: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess(data.message || "Connected successfully!");
        // Clear secrets from component state
        setKeySecret("");
        setWebhookSecret("");
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
          fetchStatus();
        }, 1200);
      } else {
        setFormError(data.error || "Connection failed. Please verify credentials.");
      }
    } catch (err: any) {
      setFormError(err?.message || "Network error while connecting to server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/razorpay", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setConfirmDisconnect(false);
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleInvestigatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigatingPaymentId.trim()) return;

    setInvestigationLoading(true);
    setInvestigationResult(null);
    try {
      const res = await fetch("/api/integrations/razorpay/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: investigatingPaymentId.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setInvestigationResult({
          success: true,
          caseId: data.case.case_id,
          message: `Successfully ingested payment ${investigatingPaymentId} into Refund Loop case queue.`,
        });
      } else {
        setInvestigationResult({
          success: false,
          error: data.error || "Payment not found in connected Razorpay account.",
        });
      }
    } catch (err: any) {
      setInvestigationResult({
        success: false,
        error: err?.message || "Error querying payment from Razorpay API.",
      });
    } finally {
      setInvestigationLoading(false);
    }
  };

  const handleTestOtherIntegration = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: data.message || (data.success ? "Connection healthy" : "Connection failed"),
      }));
    } finally {
      setTestingId(null);
    }
  };

  const isConnected = Boolean(razorpayStatus?.connected);
  const currentMode = razorpayStatus?.mode || "test";

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#000000]">Integrations & Connectors</h1>
        <p className="text-[14px] text-[#6E6E73] mt-1">
          Configure real payment gateway keys, live AI multi-provider reasoning backends, and multi-tenant security layers.
        </p>
      </div>

      {/* ─── RAZORPAY PRIMARY CONNECTOR HERO CARD ─── */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0C2340] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                ₹
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#000000] flex items-center gap-2">
                  Razorpay
                  <span
                    className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full border ${
                      isConnected
                        ? currentMode === "live"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold"
                          : "border-blue-200 bg-blue-50 text-blue-700 font-semibold"
                        : "border-[#E5E5E7] bg-[#F5F5F7] text-[#86868B]"
                    }`}
                  >
                    {isConnected
                      ? currentMode === "live"
                        ? "Connected — Live Mode"
                        : "Connected — Test Mode"
                      : "Not connected"}
                  </span>
                </h2>
                <p className="text-xs text-[#6E6E73]">
                  Post-payment investigation, telemetry reconciliation, and refund operations.
                </p>
              </div>
            </div>

            <p className="text-sm text-[#424245] leading-relaxed pt-1">
              Connect your Razorpay account to investigate stuck refunds, correlate payment telemetry, and verify settlement state with zero-trust safety policy bounds.
            </p>

            {/* Connection Telemetry Details */}
            {isConnected && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-[#F5F5F7] rounded-xl p-3 border border-[#E5E5E7]">
                  <span className="text-[11px] font-mono text-[#86868B] block">KEY ID</span>
                  <span className="text-xs font-mono font-medium text-[#1D1D1F]">
                    {razorpayStatus?.key_id_masked || "Configured"}
                  </span>
                </div>
                <div className="bg-[#F5F5F7] rounded-xl p-3 border border-[#E5E5E7]">
                  <span className="text-[11px] font-mono text-[#86868B] block">WEBHOOK SIGNATURE</span>
                  <span className="text-xs font-medium text-[#1D1D1F] flex items-center gap-1.5">
                    {razorpayStatus?.has_webhook_secret ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> HMAC SHA-256 Active
                      </>
                    ) : (
                      <span className="text-[#86868B]">Optional / Unconfigured</span>
                    )}
                  </span>
                </div>
                <div className="bg-[#F5F5F7] rounded-xl p-3 border border-[#E5E5E7]">
                  <span className="text-[11px] font-mono text-[#86868B] block">LAST VALIDATED</span>
                  <span className="text-xs font-mono text-[#1D1D1F]">
                    {razorpayStatus?.last_validated_at
                      ? new Date(razorpayStatus.last_validated_at).toLocaleTimeString()
                      : "Live Session"}
                  </span>
                </div>
              </div>
            )}

            {/* Capabilities badges */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#86868B] mr-1">CAPABILITIES:</span>
              {[
                "Payment Lookup",
                "Refund Status Fetch",
                "Webhook Verification",
                "State Reconciliation",
              ].map((cap) => (
                <span
                  key={cap}
                  className="text-[11px] font-mono bg-[#FAFAFA] border border-[#E5E5E7] text-[#424245] px-2 py-0.5 rounded-md"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2.5 shrink-0">
            {isConnected ? (
              <>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs font-medium px-4 py-2.5 rounded-full border border-[#E5E5E7] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] hover:border-[#000000] transition shadow-2xs"
                >
                  Update Credentials
                </button>
                {confirmDisconnect ? (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl">
                    <button
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="text-xs font-semibold px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      {isDisconnecting ? "Revoking..." : "Confirm Revoke"}
                    </button>
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="text-xs px-2 py-1 text-[#6E6E73] hover:text-[#000000]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-semibold px-5 py-2.5 rounded-full bg-[#000000] text-white hover:bg-[#2C2C2E] transition shadow-xs flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" /> Connect Razorpay
              </button>
            )}
          </div>
        </div>

        {/* ─── REAL PAYMENT INVESTIGATION SUB-SECTION ─── */}
        {isConnected && (
          <div className="mt-8 pt-6 border-t border-[#E5E5E7] space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#000000]" />
              <h3 className="text-sm font-semibold text-[#000000]">Investigate Live Razorpay Payment</h3>
            </div>
            <p className="text-xs text-[#6E6E73]">
              Enter a real Payment ID (e.g., <code className="bg-[#F5F5F7] px-1 py-0.5 rounded text-[#000000] font-mono">pay_xxxxxxxxx</code>) from your connected Razorpay {currentMode === "live" ? "Live" : "Test"} account to pull telemetry, verify refunds, and initiate agentic investigation.
            </p>

            <form onSubmit={handleInvestigatePayment} className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <input
                type="text"
                value={investigatingPaymentId}
                onChange={(e) => setInvestigatingPaymentId(e.target.value)}
                placeholder="pay_xxxxxxxxxxxxxx"
                className="flex-1 px-3.5 py-2 text-xs font-mono border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#000000] bg-[#FAFAFA]"
              />
              <button
                type="submit"
                disabled={investigationLoading || !investigatingPaymentId.trim()}
                className="px-4 py-2 text-xs font-semibold bg-[#000000] text-white rounded-xl hover:bg-[#2C2C2E] disabled:opacity-50 transition flex items-center justify-center gap-1.5 shrink-0"
              >
                {investigationLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Querying API...
                  </>
                ) : (
                  <>Investigate in Refund Loop</>
                )}
              </button>
            </form>

            {investigationResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  investigationResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    {investigationResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    {investigationResult.success ? "Payment Found & Ingested" : "Query Failed"}
                  </div>
                  <p>{investigationResult.message || investigationResult.error}</p>
                </div>
                {investigationResult.caseId && (
                  <Link
                    href={`/app/recovery/${investigationResult.caseId}`}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-1 shrink-0"
                  >
                    Open Case <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── WEBHOOK CONFIGURATION GUIDANCE ─── */}
        <div className="mt-6 pt-6 border-t border-[#E5E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6E6E73]">
          <div className="space-y-1">
            <span className="font-semibold text-[#1D1D1F] block">Inbound Webhook Receiver Endpoint</span>
            <code className="text-[11px] font-mono bg-[#F5F5F7] px-2 py-1 rounded text-[#1D1D1F] border border-[#E5E5E7] select-all">
              https://razorpayhackathon.vercel.app/api/webhooks/razorpay
            </code>
          </div>
          <div className="text-[11px] text-[#86868B] max-w-xs">
            Configurable in Razorpay Dashboard → Settings → Webhooks. Supported events: <code className="text-[#000000]">refund.processed</code>, <code className="text-[#000000]">refund.failed</code>.
          </div>
        </div>
      </div>

      {/* ─── MODAL: CONNECT RAZORPAY CREDENTIALS FORM ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E7] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#000000]">Connect Razorpay Account</h3>
              <p className="text-xs text-[#6E6E73]">
                Credentials are validated live against Razorpay API and stored encrypted with server-side AES-256-GCM.
              </p>
            </div>

            <form onSubmit={handleTestAndConnect} className="space-y-4">
              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1D1D1F] block">Integration Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("test")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      mode === "test"
                        ? "border-[#000000] bg-[#F5F5F7] text-[#000000]"
                        : "border-[#E5E5E7] text-[#6E6E73] hover:border-[#86868B]"
                    }`}
                  >
                    <span>●</span> Razorpay Test Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("live")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      mode === "live"
                        ? "border-amber-600 bg-amber-50 text-amber-900"
                        : "border-[#E5E5E7] text-[#6E6E73] hover:border-[#86868B]"
                    }`}
                  >
                    <span>▲</span> Live Production Mode
                  </button>
                </div>
              </div>

              {/* Live Mode Warning */}
              {mode === "live" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Production Funds Warning</span>
                    Live mode interacts with real payments and refunds. Autonomous execution is guarded by demo limits.
                  </div>
                </div>
              )}

              {/* Key ID */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1D1D1F] block">
                  Key ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  placeholder={mode === "live" ? "rzp_live_xxxxxxxxxxxxxx" : "rzp_test_xxxxxxxxxxxxxx"}
                  className="w-full px-3.5 py-2 text-xs font-mono border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#000000]"
                />
              </div>

              {/* Key Secret */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1D1D1F] block">
                  Key Secret <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeySecret ? "text" : "password"}
                    required
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                    placeholder="Enter Key Secret"
                    className="w-full pl-3.5 pr-10 py-2 text-xs font-mono border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#000000]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeySecret(!showKeySecret)}
                    className="absolute right-3 top-2.5 text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Webhook Secret (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1D1D1F] block">
                  Webhook Secret <span className="text-[#86868B] font-normal">(Optional initially)</span>
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Webhook verification secret from dashboard"
                    className="w-full pl-3.5 pr-10 py-2 text-xs font-mono border border-[#E5E5E7] rounded-xl focus:outline-none focus:border-[#000000]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-2.5 text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error / Success feedback */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError(null);
                    setKeySecret("");
                    setWebhookSecret("");
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#6E6E73] hover:text-[#000000] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-[#000000] text-white rounded-full hover:bg-[#2C2C2E] disabled:opacity-50 transition flex items-center gap-1.5 shadow-xs"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Validating API...
                    </>
                  ) : (
                    <>Test & Connect</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── OTHER CONNECTORS (AI REASONING & INFRASTRUCTURE) ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#000000]">AI Reasoning Engines & Database Infrastructure</h2>
        <div className="bg-white border border-[#E5E5E7] rounded-2xl divide-y divide-[#E5E5E7] shadow-2xs">
          {otherIntegrations.map((item) => (
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
                {testResults[item.id] && (
                  <p className="text-xs text-[#000000] font-mono pt-1">
                    ↳ {testResults[item.id]}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleTestOtherIntegration(item.id)}
                disabled={testingId === item.id}
                className="text-xs px-4 py-2 border border-[#E5E5E7] bg-white rounded-full text-[#1D1D1F] hover:border-[#000000] hover:bg-[#F5F5F7] transition disabled:opacity-50 font-medium shrink-0"
              >
                {testingId === item.id ? "Testing..." : "Test connection"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
