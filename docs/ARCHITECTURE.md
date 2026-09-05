# Architecture Design Document (ADD)

## 1. System Overview
Refund Loop is a Next.js-based monolithic application structured to handle complex autonomous refund operations safely. It separates the orchestration layer, the AI reasoning layer, and the strict deterministic execution layer.

## 2. Core Components

### 2.1 Unified Telemetry Collector
Aggregates state from multiple disjoint systems:
- `Gateway Status`: Payment gateway API.
- `Bank Settlement`: NPCI / Acquirer network switches.
- `Webhook Status`: Event delivery logs.
- `Ledger Status`: Internal accounting database.

### 2.2 Multi-Agent Orchestrator
A resilient inference engine that prevents single points of failure.
- Primary: **Google Gemini 2.5 Flash**
- Secondary Fallback: **OpenCode Zen (ling-3.0-flash)**
- Tertiary Fallback: **NVIDIA NIM (meta/llama-3.2-11b)**
- Offline Fallback: **Heuristic Rules Engine**

### 2.3 Agentic Security Policy Engine
Located in `src/lib/security/policy-engine.ts`.
Validates the AI's proposed action against 10 strict business rules:
- Amount Thresholds
- Time-locks (Wait periods)
- Destination Integrity
- Risk assessment overrides
Generates a cryptographic validation token if passed.

### 2.4 Cryptographic Audit Ledger
An append-only chain (simulated via SHA-256 hashing) that tracks:
- Initial state capture
- Agent diagnosis
- Policy gate evaluation
- Execution outcome
Integrity can be verified in real-time on the `/app/audit` dashboard.

## 3. Data Flow
1. **Trigger:** Loop Orchestrator pulls a batch of "LIMBO" cases.
2. **Collect:** Evidence collector gathers telemetry.
3. **Reason:** Multi-agent engine produces a structured diagnosis and recommended action.
4. **Govern:** Policy Engine evaluates the recommendation.
5. **Execute/Pause:** If valid, the execution API settles the case. If risky, the execution pauses for Human Cryptographic Authorization.
6. **Audit:** All steps are hashed and logged.
