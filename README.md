# REFUND LOOP: Autonomous Post-Payment Operations Engine

> **Razorpay AI Buildathon 2026** | **Track**: AI Revenue Recovery  
> **Tagline**: *"Post-payment operations, without the waiting."*  
> **Platform**: Production-Grade Closed-Loop Agentic Platform

---

## 1. Problem

When refunds fail or get trapped in post-payment processing limbo (between acquiring bank switches, payment gateways, and merchant webhook workers), merchants and customers are left waiting for days. 

Standard operations teams handle stuck refunds through slow, manual, repetitive investigations:
1. Manually reading gateway reversal status.
2. Checking acquiring switch RRN logs.
3. Looking up merchant webhook delivery failures.
4. Manually retrying webhooks or reconciling accounting ledgers.

This operational friction results in duplicate customer support tickets, merchant churn, and unnecessary operational loss.

---

## 2. Solution

**Refund Loop** is an autonomous closed-loop payment operations platform that:
1. **Detects** stuck refunds across payment subsystems.
2. **Correlates** telemetry evidence from 5 decoupled systems (Gateway, Acquiring Bank Leg, Webhook Dispatcher, Beneficiary Validator, Internal Ledger).
3. **Diagnoses** the failure stage using real external AI models (**Google Gemini 3.6/2.5 Flash**, **OpenCode Zen**, **NVIDIA NIM**).
4. **Validates** action authorization against 10 deterministic, non-bypassable policy guardrails.
5. **Executes** whitelisted bounded remediations through live or development sandbox payment adapters.
6. **Verifies** outcome state mutation independently post-action—refusing to assume HTTP 200 means success.
7. **Halts Safely** without blind retries when downstream settlement remains unconfirmed.

---

## 3. Architecture

```text
Next.js 15 (App Router)
  ↓
Supabase Auth (PBKDF2 / Session / RLS)
  ↓
Supabase Postgres (Relational Schema + Foreign Keys)
  ↓
Supabase Edge Functions (agent-run, refund-investigate, refund-action, refund-verify, audit)
  ↓
External AI Providers (Google Gemini 3.6/2.5 Flash, OpenCode Zen, NVIDIA NIM)
  ↓
Razorpay Public API / Development Sandbox Adapter
  ↓
Outcome Verification Engine
  ↓
Cryptographic Append-Only Audit Chain (SHA-256)
```

---

## 4. Environment Variables

Create `.env` or `.env.local` in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_REF=your-project-ref

# Razorpay API Credentials
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret

# AI Provider Credentials (Real External APIs)
GEMINI_API_KEY=your_gemini_api_key
OPENCODE_API_KEY=your_opencode_api_key
NVIDIA_API_KEY=your_nvidia_nim_key
```

---

## 5. Local Setup & Supabase Workflow

### 1. Install Dependencies
```bash
npm install
```

### 2. Supabase CLI Setup
```bash
# Initialize Supabase
npx supabase init

# Link to remote Supabase project
npx supabase link --project-ref <PROJECT_REF>

# Run dry-run migration check
npx supabase db push --dry-run

# Push database schema migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy agent-run
npx supabase functions deploy refund-investigate
npx supabase functions deploy refund-action
npx supabase functions deploy refund-verify
npx supabase functions deploy audit
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000`.

---

## 6. Real AI Integration & Output Schema

The diagnostic engine connects directly to live external LLM endpoints:
- **Google Gemini**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`
- **OpenCode Zen**: `POST https://opencode.ai/zen/v1/chat/completions` (`mimo-v2.5-free`)
- **NVIDIA NIM**: `POST https://integrate.api.nvidia.com/v1/chat/completions`

### Structured JSON Schema
```json
{
  "likely_stage": "webhook_missing",
  "confidence": 0.96,
  "recommended_action": "resend_webhook",
  "reasoning": "Gateway and bank switch confirmed customer credit reversal, but merchant webhook delivery timed out.",
  "evidence_used": ["Gateway: ACKNOWLEDGED", "Bank: CREDIT_CONFIRMED", "Webhook: 500_SERVER_ERROR"]
}
```

If no external AI key is configured or all providers fail, the system returns `AI_UNAVAILABLE` and halts safely. It **never** disguises a local fallback as artificial intelligence.

---

## 7. Deterministic Policy Guardrails (10 Rules)

The AI model **never** determines whether it is permitted to execute. That authority belongs strictly to the deterministic policy engine:

1. `RULE_1_LOW_CONFIDENCE`: Model confidence $< 0.85 \implies$ Human Escalation.
2. `RULE_2_HIGH_VALUE_THRESHOLD`: Refund liability $> ₹50,000 \implies$ Human Escalation.
3. `RULE_3_MAX_REMEDIATION_LIMIT`: Maximum 1 autonomous remediation attempt per refund.
4. `RULE_9_UNSUPPORTED_ACTION`: Only whitelisted operations (`resend_webhook`, `refresh_status`, `reconcile_state`, `verify_refund`) can execute.
5. `RULE_10_MISSING_EVIDENCE`: Incomplete telemetry halts autonomous action.

---

## 8. Cryptographic Tamper-Evident Audit Ledger

Every event is appended to an immutable SHA-256 hash chain:

$$\text{event\_hash} = \text{SHA-256}(\text{previous\_hash} + \text{case\_id} + \text{stage} + \text{action} + \text{timestamp})$$

The UI features a **"Verify Audit Integrity"** button that recomputes and validates the entire cryptographic chain on demand.

---

## 9. What is Real vs What is Unsupported

### What is Real:
- **Real AI**: Google Gemini 3.6/2.5 Flash and OpenCode Zen MIMO live model execution.
- **Real Auth & Storage**: PBKDF2-SHA512 crypto, HTTP-only sessions, and multi-tenant workspace isolation.
- **Real Supabase Architecture**: Full relational Postgres schema migration with RLS policies and Edge Functions.
- **Real Razorpay Integration**: Authenticated `GET /v1/refunds/{id}` and `GET /v1/payments/{id}` endpoints.
- **Real Tamper-Evident Ledger**: Cryptographic SHA-256 hash chain verification.
- **Real Outcome Verification**: Post-action state verification that catches planted failures without blind retries.

### What is Not Supported / Prohibited:
- Arbitrary customer refund account redirection (`correct_destination`) is strictly prohibited.
- Direct internal bank switch/NPCI queuing operations are not exposed via public merchant REST APIs and are accurately handled as operations layer test fixtures.
- The system does not claim that completing a refund creates revenue (it resolves post-payment refund liabilities and prevents operational loss).

---

## 10. Automated Tests & Build Verification

```bash
# Run unit, security, and closed-loop integration tests
npm test

# Build production bundle
npm run build
```
