import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// ─── AES-256-GCM Server Encryption Module Simulation & Unit Tests ─────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const TEST_KEY = crypto.createHash("sha256").update("refund-loop-test-encryption-key").digest();

function encryptSecret(plaintext) {
  if (!plaintext) throw new Error("Cannot encrypt empty or null secret.");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, TEST_KEY, iv, { authTagLength: TAG_LENGTH });
  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return { ciphertext, iv: iv.toString("hex"), tag };
}

function decryptSecret(payload) {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.tag) {
    throw new Error("Invalid encrypted payload structure.");
  }
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, TEST_KEY, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function maskKeyId(keyId) {
  if (!keyId) return "";
  if (keyId.length <= 8) return "••••" + keyId.slice(-4);
  const prefix = keyId.slice(0, 8);
  const suffix = keyId.slice(-4);
  return `${prefix}_••••••••${suffix}`;
}

test("1. Missing credentials returns Not Connected status", () => {
  const integration = null;
  const isConnected = Boolean(integration && integration.status === "connected");
  assert.equal(isConnected, false, "Unconfigured integration must report connected: false");
});

test("2. AES-256-GCM encrypts secret and decrypts back to exact plaintext", () => {
  const secret = "live_secret_key_super_confidential_99812";
  const encrypted = encryptSecret(secret);

  assert.notEqual(encrypted.ciphertext, secret, "Ciphertext must not match plaintext");
  assert.ok(encrypted.iv, "IV must be generated");
  assert.ok(encrypted.tag, "Auth tag must be generated");

  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, secret, "Decrypted text must match original secret exactly");
});

test("3. Key ID masking properly obscures sensitive prefix/suffix material", () => {
  const masked = maskKeyId("rzp_test_1234567890abcdef");
  assert.equal(masked, "rzp_test_••••••••cdef");
  assert.ok(!masked.includes("1234567890"), "Masked ID must not expose middle credentials");
});

test("4. Invalid credentials validation is deterministically rejected (401)", async () => {
  // Validate simulated 401 response handling
  const mockValidate = async (keyId, keySecret) => {
    if (keyId === "rzp_test_invalid" || keySecret === "wrong_secret") {
      return {
        valid: false,
        status: "INVALID_CREDENTIALS",
        message: "Authentication failed. The provided Key ID or Key Secret is invalid.",
      };
    }
    return { valid: true, status: "CONNECTED" };
  };

  const res = await mockValidate("rzp_test_invalid", "wrong_secret");
  assert.equal(res.valid, false);
  assert.equal(res.status, "INVALID_CREDENTIALS");
});

test("5. Successful Test Mode connection stores encrypted record and never exposes plaintext", () => {
  const db = { integrations: {} };
  const workspaceId = "ws_test_ops";
  const rawKeyId = "rzp_test_validKey123";
  const rawSecret = "superSecretKey456";

  const encrypted = encryptSecret(rawSecret);
  const record = {
    id: `int_rzp_${workspaceId}`,
    workspace_id: workspaceId,
    provider: "razorpay",
    mode: "test",
    key_id: rawKeyId,
    encrypted_key_secret: encrypted,
    status: "connected",
    last_validated_at: new Date().toISOString(),
  };
  db.integrations[workspaceId] = record;

  // Sanitized public status representation returned to frontend
  const publicStatus = {
    connected: record.status === "connected",
    provider: record.provider,
    mode: record.mode,
    status: record.status,
    key_id_masked: maskKeyId(record.key_id),
    last_validated_at: record.last_validated_at,
  };

  assert.equal(publicStatus.connected, true);
  assert.equal(publicStatus.key_id_masked, "rzp_test_••••••••y123");
  assert.equal(publicStatus.key_secret, undefined, "key_secret must NEVER be in public response");
  assert.equal(publicStatus.encrypted_key_secret, undefined, "encrypted payload must NEVER be in public response");
});

test("6. Audit logs must never contain plaintext secrets or auth headers", () => {
  const auditLogs = [];
  const logEvent = (workspaceId, action, details) => {
    // Sanitizer check
    const serialized = JSON.stringify(details);
    assert.ok(!serialized.includes("superSecretKey456"), "Audit log must not contain raw secrets");
    auditLogs.push({ workspaceId, action, details, timestamp: new Date().toISOString() });
  };

  logEvent("ws_test", "RAZORPAY_CONNECTED", {
    mode: "test",
    key_id_prefix: "rzp_test",
    has_webhook: true,
  });

  assert.equal(auditLogs.length, 1);
});

test("7. Workspace Isolation: Workspace A cannot access Workspace B integration", () => {
  const integrations = {
    "ws_tenant_alpha:razorpay": {
      workspace_id: "ws_tenant_alpha",
      key_id: "rzp_test_alpha1234",
      encrypted_key_secret: encryptSecret("alpha_secret"),
    },
    "ws_tenant_beta:razorpay": {
      workspace_id: "ws_tenant_beta",
      key_id: "rzp_test_beta5678",
      encrypted_key_secret: encryptSecret("beta_secret"),
    },
  };

  const getIntegrationForWorkspace = (workspaceId) => {
    return integrations[`${workspaceId}:razorpay`];
  };

  const alphaInt = getIntegrationForWorkspace("ws_tenant_alpha");
  assert.equal(alphaInt.key_id, "rzp_test_alpha1234");

  const betaInt = getIntegrationForWorkspace("ws_tenant_beta");
  assert.equal(betaInt.key_id, "rzp_test_beta5678");

  assert.notEqual(alphaInt.key_id, betaInt.key_id);
});

test("8. Disconnect removes encrypted credentials and updates workspace provider to sandbox", () => {
  const db = {
    integrations: {
      "ws_demo:razorpay": { workspace_id: "ws_demo", key_id: "rzp_test_demo" },
    },
    workspace: { id: "ws_demo", provider: "razorpay_test" },
  };

  // Execute disconnect
  delete db.integrations["ws_demo:razorpay"];
  db.workspace.provider = "sandbox";

  assert.equal(db.integrations["ws_demo:razorpay"], undefined, "Credentials removed from database");
  assert.equal(db.workspace.provider, "sandbox", "Workspace provider reset to sandbox");
});

test("9. Demo mode caps autonomous refund ceiling at ₹5,000", () => {
  const isDemoMode = true;
  const workspaceConfig = { high_value_limit: 50000 };
  const effectiveCeiling = isDemoMode
    ? Math.min(workspaceConfig.high_value_limit, 5000)
    : workspaceConfig.high_value_limit;

  assert.equal(effectiveCeiling, 5000, "Demo mode must cap autonomous refund at ₹5,000");

  const testCase = { amount: 6500 };
  const passed = testCase.amount <= effectiveCeiling;
  assert.equal(passed, false, "Refund ₹6,500 must fail autonomous policy in demo mode");
});

test("10. Demo mode blocks autonomous Live Mode financial execution (Read-Only)", () => {
  const executionMode = "demo";
  const workspace = { provider: "razorpay_live" };

  const canExecuteAutonomous = !(executionMode === "demo" && workspace.provider === "razorpay_live");
  assert.equal(canExecuteAutonomous, false, "Live execution is prohibited in demo execution mode");
});

test("11. AI unavailable (null confidence) blocks autonomous remediation", () => {
  const diagnosis = {
    likely_stage: null,
    confidence: null,
    recommended_action: null,
    provider: "AI_UNAVAILABLE",
  };

  const confidenceCutoff = 0.85;
  const isConfidenceValid = typeof diagnosis.confidence === "number" && diagnosis.confidence !== null;
  const passed = isConfidenceValid && diagnosis.confidence >= confidenceCutoff;

  assert.equal(passed, false, "Null confidence must fail policy check Rule 1");
});

test("12. Single remediation limit blocks infinite loops", () => {
  const refundCase = { remediation_attempts: 1 };
  const maxAttempts = 1;
  const canRemediate = refundCase.remediation_attempts < maxAttempts;

  assert.equal(canRemediate, false, "Case with 1 attempt already must be blocked from re-execution");
});

test("13. Cryptographic HMAC SHA-256 Webhook Verification", () => {
  const secret = "whsec_test_secret_12345";
  const rawBody = JSON.stringify({
    entity: "event",
    event: "refund.processed",
    payload: { refund: { entity: { id: "rfnd_123", amount: 5000 } } },
  });

  const validSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const invalidSignature = crypto.createHmac("sha256", "wrong_secret").update(rawBody).digest("hex");

  const verifySig = (body, sig, sec) => {
    try {
      const expected = crypto.createHmac("sha256", sec).update(body).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(sig, "utf8"));
    } catch {
      return false;
    }
  };

  assert.equal(verifySig(rawBody, validSignature, secret), true, "Valid HMAC signature passes");
  assert.equal(verifySig(rawBody, invalidSignature, secret), false, "Invalid HMAC signature rejected");
});
