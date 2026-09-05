import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  Workspace,
  User,
  Session,
  RefundCase,
  AuditLogEntry,
  AllowedAction,
  SandboxConfig,
  ExecutionAuthorization,
  PolicyEvaluationRecord,
  WorkspaceIntegration,
} from "@/types";
import { generateRefundDataset } from "../simulator/generator";

interface DatabaseSchema {
  workspaces: Record<string, Workspace>;
  users: Record<string, User>;
  sessions: Record<string, Session>;
  cases: Record<string, RefundCase>;
  audit_logs: AuditLogEntry[];
  sandbox_configs: Record<string, SandboxConfig>;
  authorizations: Record<string, ExecutionAuthorization>;
  policy_evaluations: Record<string, PolicyEvaluationRecord>;
  integrations?: Record<string, WorkspaceIntegration>;
}


const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

declare global {
  // eslint-disable-next-line no-var
  var __APP_DATABASE__: DatabaseSchema | undefined;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function computeEventHash(previousHash: string, caseId: string, stage: string, action: string, timestamp: string): string {
  const content = `${previousHash}:${caseId}:${stage}:${action}:${timestamp}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

function initDb(): DatabaseSchema {
  if (globalThis.__APP_DATABASE__) {
    return globalThis.__APP_DATABASE__;
  }

  // Ensure data directory exists
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not create data directory (likely read-only environment like Vercel).", err);
  }

  // If db.json exists on disk, load it
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content) as DatabaseSchema;
      if (parsed.workspaces && parsed.users) {
        if (!parsed.authorizations) parsed.authorizations = {};
        if (!parsed.policy_evaluations) parsed.policy_evaluations = {};
        if (!parsed.integrations) parsed.integrations = {};
        globalThis.__APP_DATABASE__ = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to load existing db.json, generating fresh seed.", e);
    }
  }

  // Fresh initial seed
  const defaultSalt = crypto.randomBytes(16).toString("hex");
  const defaultPasswordHash = hashPassword("Password123!", defaultSalt);

  const demoUser: User = {
    id: "usr_demo_01",
    email: "demo@razorpay.com",
    name: "Aarush (Lead Ops)",
    role: "admin",
    password_hash: defaultPasswordHash,
    salt: defaultSalt,
    created_at: new Date().toISOString(),
  };

  const demoWorkspace: Workspace = {
    id: "ws_razorpay_demo",
    name: "Razorpay Enterprise Ops",
    slug: "razorpay-ops",
    provider: process.env.RAZORPAY_KEY_ID ? "razorpay_live" : "sandbox",
    autonomy_mode: "APPROVAL_REQUIRED",
    confidence_threshold: 0.85,
    high_value_limit: 50000,
    max_attempts: 1,
    allowed_actions: ["resend_webhook", "reconcile_state", "refresh_status", "verify_refund"],
    created_at: new Date().toISOString(),
  };

  // Generate synthetic cases for default workspace
  const generated = generateRefundDataset({
    seed: 12345,
    difficulty: "normal",
    count: 100,
    confidence_threshold: 0.85,
    high_value_threshold: 50000,
  });

  const casesMap: Record<string, RefundCase> = {};
  for (const c of generated) {
    const fullCase: RefundCase = {
      ...c,
      id: `case_${c.case_id}`,
      workspace_id: demoWorkspace.id,
      updated_at: c.created_at,
    };
    casesMap[fullCase.case_id] = fullCase;
  }

  const initialTimestamp = new Date().toISOString();
  const genesisHash = "0".repeat(64);
  const firstEventHash = computeEventHash(genesisHash, "SYSTEM", "DETECT", "WORKSPACE_PROVISIONED", initialTimestamp);

  const initialAudit: AuditLogEntry[] = [
    {
      id: `audit_init_${Date.now()}`,
      workspace_id: demoWorkspace.id,
      case_id: "SYSTEM",
      timestamp: initialTimestamp,
      actor: "SYSTEM",
      stage: "DETECT",
      action: "WORKSPACE_PROVISIONED",
      provider: demoWorkspace.provider,
      message: `Refund Loop operations database seeded for workspace '${demoWorkspace.name}' (${generated.length} refunds loaded).`,
      status: "INFO",
      previous_hash: genesisHash,
      event_hash: firstEventHash,
    },
  ];

  const db: DatabaseSchema = {
    workspaces: { [demoWorkspace.id]: demoWorkspace },
    users: { [demoUser.id]: demoUser },
    sessions: {},
    cases: casesMap,
    audit_logs: initialAudit,
    sandbox_configs: {
      [demoWorkspace.id]: { seed: 12345, difficulty: "normal", count: 100 },
    },
    authorizations: {},
    policy_evaluations: {},
    integrations: {},
  };

  globalThis.__APP_DATABASE__ = db;
  saveToDisk(db);
  return db;
}

function saveToDisk(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database to disk:", err);
  }
}

export const Database = {
  // Workspaces
  getWorkspace(workspaceId: string): Workspace | undefined {
    const db = initDb();
    return db.workspaces[workspaceId];
  },

  getAllWorkspaces(): Workspace[] {
    const db = initDb();
    return Object.values(db.workspaces);
  },

  createWorkspace(workspace: Omit<Workspace, "created_at">): Workspace {
    const db = initDb();
    const newWs: Workspace = {
      ...workspace,
      created_at: new Date().toISOString(),
    };
    db.workspaces[newWs.id] = newWs;
    saveToDisk(db);
    return newWs;
  },

  updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Workspace {
    const db = initDb();
    const existing = db.workspaces[workspaceId];
    if (!existing) throw new Error(`Workspace ${workspaceId} not found`);
    const updated = { ...existing, ...updates };
    db.workspaces[workspaceId] = updated;
    saveToDisk(db);
    return updated;
  },

  // Users
  getUserByEmail(email: string): User | undefined {
    const db = initDb();
    return Object.values(db.users).find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserById(userId: string): User | undefined {
    const db = initDb();
    return db.users[userId];
  },

  createUser(user: Omit<User, "id" | "created_at">): User {
    const db = initDb();
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      created_at: new Date().toISOString(),
    };
    db.users[newUser.id] = newUser;
    saveToDisk(db);
    return newUser;
  },

  // Sessions
  createSession(userId: string, workspaceId: string): Session {
    const db = initDb();
    const token = `sess_${crypto.randomBytes(32).toString("hex")}`;
    const session: Session = {
      token,
      user_id: userId,
      workspace_id: workspaceId,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    db.sessions[token] = session;
    saveToDisk(db);
    return session;
  },

  getSession(token: string): Session | undefined {
    const db = initDb();
    const session = db.sessions[token];
    if (!session) return undefined;
    if (Date.now() > session.expires_at) {
      delete db.sessions[token];
      saveToDisk(db);
      return undefined;
    }
    return session;
  },

  deleteSession(token: string): void {
    const db = initDb();
    delete db.sessions[token];
    saveToDisk(db);
  },

  // Refund Cases (Workspace Scoped)
  getCases(workspaceId: string): RefundCase[] {
    const db = initDb();
    return Object.values(db.cases).filter((c) => c.workspace_id === workspaceId);
  },

  getCase(workspaceId: string, caseId: string): RefundCase | undefined {
    const db = initDb();
    const c = db.cases[caseId];
    if (c && c.workspace_id === workspaceId) return c;
    return undefined;
  },

  updateCase(workspaceId: string, updated: RefundCase): void {
    const db = initDb();
    if (updated.workspace_id !== workspaceId) {
      throw new Error("Unauthorized workspace access attempt.");
    }
    updated.updated_at = new Date().toISOString();
    db.cases[updated.case_id] = updated;
    saveToDisk(db);
  },

  createCase(caseData: Omit<RefundCase, "id" | "created_at" | "updated_at">): RefundCase {
    const db = initDb();
    const newCase: RefundCase = {
      ...caseData,
      id: `case_${caseData.case_id}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.cases[newCase.case_id] = newCase;
    saveToDisk(db);
    return newCase;
  },

  // Audit Logs (Cryptographic Append-Only Tamper-Evident Hash Chain)
  getAuditLogs(workspaceId: string, limit = 200): AuditLogEntry[] {
    const db = initDb();
    return db.audit_logs
      .filter((l) => l.workspace_id === workspaceId)
      .slice(-limit)
      .reverse();
  },

  addAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp" | "previous_hash" | "event_hash">): AuditLogEntry {
    const db = initDb();
    const workspaceLogs = db.audit_logs.filter((l) => l.workspace_id === entry.workspace_id);
    const lastLog = workspaceLogs[workspaceLogs.length - 1];
    const previous_hash = lastLog?.event_hash || "0".repeat(64);
    const timestamp = new Date().toISOString();
    const event_hash = computeEventHash(
      previous_hash,
      entry.case_id,
      entry.stage,
      entry.action || entry.stage,
      timestamp
    );

    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      timestamp,
      previous_hash,
      event_hash,
    };
    db.audit_logs.push(newEntry);
    if (db.audit_logs.length > 5000) {
      db.audit_logs.shift();
    }
    saveToDisk(db);
    return newEntry;
  },

  verifyAuditIntegrity(workspaceId: string): { valid: boolean; count: number; error?: string } {
    const db = initDb();
    const workspaceLogs = db.audit_logs.filter((l) => l.workspace_id === workspaceId);
    let expectedPrevious = "0".repeat(64);

    for (let i = 0; i < workspaceLogs.length; i++) {
      const log = workspaceLogs[i];
      if (log.previous_hash !== expectedPrevious) {
        return {
          valid: false,
          count: workspaceLogs.length,
          error: `Broken chain at entry index ${i} (ID: ${log.id}). Previous hash mismatch.`,
        };
      }
      const recalculated = computeEventHash(
        log.previous_hash,
        log.case_id,
        log.stage,
        log.action || log.stage,
        log.timestamp
      );
      if (log.event_hash !== recalculated) {
        return {
          valid: false,
          count: workspaceLogs.length,
          error: `Tampered hash at entry index ${i} (ID: ${log.id}). Content does not match cryptographic signature.`,
        };
      }
      expectedPrevious = log.event_hash;
    }

    return { valid: true, count: workspaceLogs.length };
  },

  // Sandbox Config (Workspace Scoped)
  getSandboxConfig(workspaceId: string): SandboxConfig {
    const db = initDb();
    return (
      db.sandbox_configs[workspaceId] || {
        seed: 12345,
        difficulty: "normal",
        count: 100,
      }
    );
  },

  regenerateSandboxDataset(
    workspaceId: string,
    seed: number,
    difficulty: "easy" | "normal" | "ambiguous",
    count = 100
  ): RefundCase[] {
    const db = initDb();
    db.sandbox_configs[workspaceId] = { seed, difficulty, count };

    // Remove existing cases for this workspace
    for (const key of Object.keys(db.cases)) {
      if (db.cases[key].workspace_id === workspaceId) {
        delete db.cases[key];
      }
    }

    // Reset audit logs for this workspace
    db.audit_logs = db.audit_logs.filter((l) => l.workspace_id !== workspaceId);

    // Generate fresh cases
    const dataset = generateRefundDataset({
      seed,
      difficulty,
      count,
      confidence_threshold: 0.85,
      high_value_threshold: 50000,
    });

    for (const c of dataset) {
      db.cases[c.case_id] = {
        ...c,
        id: `case_${c.case_id}`,
        workspace_id: workspaceId,
        updated_at: c.created_at,
      };
    }

    this.addAuditLog({
      workspace_id: workspaceId,
      case_id: "SYSTEM",
      actor: "SYSTEM",
      stage: "DETECT",
      action: "SANDBOX_DATASET_REGENERATED",
      provider: "DEVELOPMENT_SANDBOX",
      message: `Regenerated test dataset with seed ${seed}, difficulty '${difficulty}' (${dataset.length} cases).`,
      status: "INFO",
    });

    saveToDisk(db);
    return this.getCases(workspaceId);
  },

  // ─── Policy Evaluations (Immutable Audit Persistence) ───────────────────
  savePolicyEvaluation(record: PolicyEvaluationRecord): void {
    const db = initDb();
    if (!db.policy_evaluations) db.policy_evaluations = {};
    db.policy_evaluations[record.evaluation_id] = record;
    saveToDisk(db);
  },

  getPolicyEvaluation(evaluationId: string): PolicyEvaluationRecord | undefined {
    const db = initDb();
    return db.policy_evaluations?.[evaluationId];
  },

  getPolicyEvaluationsForCase(workspaceId: string, caseId: string): PolicyEvaluationRecord[] {
    const db = initDb();
    if (!db.policy_evaluations) return [];
    return Object.values(db.policy_evaluations)
      .filter((r) => r.workspace_id === workspaceId && r.case_id === caseId)
      .sort((a, b) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime());
  },

  // ─── Execution Authorizations (Strict Server-Side Bounded Tokens) ──────────
  createExecutionAuthorization(auth: ExecutionAuthorization): void {
    const db = initDb();
    if (!db.authorizations) db.authorizations = {};
    db.authorizations[auth.authorization_id] = auth;
    saveToDisk(db);
  },

  getExecutionAuthorization(authorizationId: string): ExecutionAuthorization | undefined {
    const db = initDb();
    return db.authorizations?.[authorizationId];
  },

  /**
   * Atomic consumption of execution authorization.
   * Protects against race conditions / double execution.
   */
  consumeExecutionAuthorization(
    authorizationId: string,
    workspaceId: string,
    caseId: string,
    consumer = "PAYMENT_EXECUTOR"
  ): { success: boolean; error?: string; authorization?: ExecutionAuthorization } {
    const db = initDb();
    if (!db.authorizations) db.authorizations = {};
    const auth = db.authorizations[authorizationId];

    if (!auth) {
      return { success: false, error: "EXECUTION_NOT_AUTHORIZED: Authorization token not found." };
    }

    if (auth.workspace_id !== workspaceId) {
      return { success: false, error: "EXECUTION_NOT_AUTHORIZED: Cross-workspace authorization forbidden." };
    }

    if (auth.case_id !== caseId) {
      return { success: false, error: "EXECUTION_NOT_AUTHORIZED: Authorization token does not match target case." };
    }

    if (auth.consumed) {
      return { success: false, error: "AUTHORIZATION_ALREADY_USED: Token has already been consumed." };
    }

    const now = Date.now();
    if (now > auth.expires_at) {
      return { success: false, error: "AUTHORIZATION_EXPIRED: Token expired after TTL." };
    }

    // Atomic mark as consumed
    auth.consumed = true;
    auth.consumed_at = now;
    auth.consumed_by = consumer;
    saveToDisk(db);

    return { success: true, authorization: auth };
  },

  // ─── Workspace Integrations (Secure Server-Only Credentials) ───────────
  getIntegration(workspaceId: string, provider = "razorpay"): WorkspaceIntegration | undefined {
    const db = initDb();
    if (!db.integrations) return undefined;
    const compositeKey = `${workspaceId}:${provider}`;
    return db.integrations[compositeKey];
  },

  getAllIntegrations(workspaceId: string): WorkspaceIntegration[] {
    const db = initDb();
    if (!db.integrations) return [];
    return Object.values(db.integrations).filter((i) => i.workspace_id === workspaceId);
  },

  saveIntegration(integration: WorkspaceIntegration): WorkspaceIntegration {
    const db = initDb();
    if (!db.integrations) db.integrations = {};
    const compositeKey = `${integration.workspace_id}:${integration.provider}`;
    db.integrations[compositeKey] = {
      ...integration,
      updated_at: new Date().toISOString(),
    };
    saveToDisk(db);
    return db.integrations[compositeKey];
  },

  deleteIntegration(workspaceId: string, provider = "razorpay"): boolean {
    const db = initDb();
    if (!db.integrations) return false;
    const compositeKey = `${workspaceId}:${provider}`;
    if (db.integrations[compositeKey]) {
      delete db.integrations[compositeKey];
      saveToDisk(db);
      return true;
    }
    return false;
  },
};


