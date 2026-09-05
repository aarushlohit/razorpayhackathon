# 🔄 Refund Loop 
> Autonomous Post-Payment Operations Engine for Razorpay

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Security](https://img.shields.io/badge/security-Agentic%20Cryptographic-blue)
![Architecture](https://img.shields.io/badge/architecture-Multi--Agent-orange)

Refund Loop is a zero-trust, autonomous multi-agent system designed to resolve "limbo" refunds at fintech scale. It orchestrates unified telemetry across payment gateways, bank settlement networks, webhooks, and ledgers to autonomously diagnose and execute remediation actions safely.

## 🚀 The Problem
At Razorpay scale, thousands of refunds get stuck in a "limbo" state due to:
- Dropped or delayed webhooks.
- Stalled bank network legs (NPCI/Switch timeouts).
- Desynchronized internal ledgers.

Resolving these requires manual operations, trapping millions in liability and hurting merchant trust.

## 💡 The Solution
Refund Loop replaces manual investigation with **Agentic Autonomous Operations**. 
- **Unified Telemetry:** Extracts state from all 4 payment legs.
- **Multi-Agent Diagnosis:** Cascading fallback inference (Gemini 2.5 Flash → OpenCode Zen → NVIDIA NIM) prevents downtime and hallucination.
- **Top-Level Security:** A strict, non-bypassable **Agentic Cryptographic Policy Engine** runs server-side to validate every decision.

## 🛡️ Top-Level Security Architecture
We do not blindly trust LLMs with financial execution. 
1. The AI Agent proposes a remediation action and reason.
2. The deterministic Server-Side Policy Engine evaluates 10 strict guardrails (e.g., amount limits, destination validation, time-locks).
3. If passed, the system proceeds. If ambiguous or high-risk, a **Cryptographic Safety Boundary** pauses execution, requiring human sign-off.
4. Every single action is written to an **Append-Only Cryptographic SHA-256 Audit Ledger**.

## 🛠️ Tech Stack
- **Frontend:** Next.js 15 (React 19), Tailwind CSS, Lucide Icons
- **Backend:** Next.js App Router (Serverless API)
- **AI/Agents:** Multi-provider LLM Orchestration
- **Security:** Next.js Security Headers (CSP, HSTS, X-Frame-Options), Zero-Trust Execution

## 📖 Documentation
Detailed technical specifications are available in the `docs/` directory:
- [Architecture Design Document (ADD)](docs/ARCHITECTURE.md)
- [Software Requirements Specification (SRS)](docs/SRS.md)

## ⚡ Quick Start
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` to view the Executive Operations Dashboard.

---
*Built for the Razorpay Buildathon by Aarush.*
