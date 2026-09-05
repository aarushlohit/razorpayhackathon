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
} from "@/types";
import { generateRefundDataset } from "../simulator/generator";

interface DatabaseSchema {
  workspaces: Record<string, Workspace>;
  users: Record<string, User>;
  sessions: Record<string, Session>;
  cases: Record<string, RefundCase>;
  audit_logs: AuditLogEntry[];
  sandbox_configs: Record<string, SandboxConfig>;
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

function initDb(): DatabaseSchema {
  if (globalThis.__APP_DATABASE__) {
    return globalThis.__APP_DATABASE__;
  }

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // If db.json exists on disk, load it
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content) as DatabaseSchema;
      if (parsed.workspaces && parsed.users) {
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
    provider: process.env.RAZORPAY_KEY_ID ? "razorpay_test" : "sandbox",
    autonomy_mode: "APPROVAL_REQUIRED",
    confidence_threshold: 0.85,
    high_value_limit: 50000,
    max_attempts: 1,
    allowed_actions: ["resend_webhook", "retrigger_bank_leg", "correct_destination"],
    created_at: new Date().toISOString(),
  };

  // Generate 300 synthetic cases for default workspace
  const generated = generateRefundDataset({
    seed: 12345,
    difficulty: "normal",
    count: 300,
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

  const initialAudit: AuditLogEntry[] = [
    {
      id: `audit_init_${Date.now()}`,
      workspace_id: demoWorkspace.id,
      case_id: "SYSTEM",
      timestamp: new Date().toISOString(),
      actor: "SYSTEM",
      stage: "DETECT",
      action: "WORKSPACE_PROVISIONED",
      provider: demoWorkspace.provider,
      message: `Refund Loop operations database seeded for workspace '${demoWorkspace.name}' (${generated.length} refunds loaded).`,
      status: "INFO",
    },
  ];

  const db: DatabaseSchema = {
    workspaces: { [demoWorkspace.id]: demoWorkspace },
    users: { [demoUser.id]: demoUser },
    sessions: {},
    cases: casesMap,
    audit_logs: initialAudit,
    sandbox_configs: {
      [demoWorkspace.id]: { seed: 12345, difficulty: "normal", count: 300 },
    },
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

  // Audit Logs (Workspace Scoped)
  getAuditLogs(workspaceId: string, limit = 200): AuditLogEntry[] {
    const db = initDb();
    return db.audit_logs
      .filter((l) => l.workspace_id === workspaceId)
      .slice(-limit)
      .reverse();
  },

  addAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const db = initDb();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      timestamp: new Date().toISOString(),
    };
    db.audit_logs.push(newEntry);
    if (db.audit_logs.length > 2000) {
      db.audit_logs.shift();
    }
    saveToDisk(db);
    return newEntry;
  },

  // Sandbox Config (Workspace Scoped)
  getSandboxConfig(workspaceId: string): SandboxConfig {
    const db = initDb();
    return (
      db.sandbox_configs[workspaceId] || {
        seed: 12345,
        difficulty: "normal",
        count: 300,
      }
    );
  },

  regenerateSandboxDataset(
    workspaceId: string,
    seed: number,
    difficulty: "easy" | "normal" | "ambiguous",
    count = 300
  ): RefundCase[] {
    const db = initDb();
    db.sandbox_configs[workspaceId] = { seed, difficulty, count };

    // Remove existing cases for this workspace
    for (const key of Object.keys(db.cases)) {
      if (db.cases[key].workspace_id === workspaceId) {
        delete db.cases[key];
      }
    }

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
      provider: "SANDBOX",
      message: `Regenerated developer sandbox with seed ${seed}, difficulty '${difficulty}' (${dataset.length} cases).`,
      status: "INFO",
    });

    saveToDisk(db);
    return this.getCases(workspaceId);
  },
};
