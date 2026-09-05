import type { RefundCase, AuditLogEntry, SimulatorConfig } from "../../types/index";
import { generateRefundDataset } from "./generator";

declare global {
  // eslint-disable-next-line no-var
  var __REFUND_STORE__: {
    cases: Map<string, RefundCase>;
    auditLog: AuditLogEntry[];
    config: SimulatorConfig;
    isInitialized: boolean;
  } | undefined;
}

const DEFAULT_CONFIG: SimulatorConfig = {
  seed: 12345,
  difficulty: "normal",
  count: 300,
  confidence_threshold: 0.85,
  high_value_threshold: 50000,
};

function getStore() {
  if (!globalThis.__REFUND_STORE__) {
    const cases = new Map<string, RefundCase>();
    const dataset = generateRefundDataset(DEFAULT_CONFIG);
    for (const c of dataset) {
      cases.set(c.case_id, c);
    }

    globalThis.__REFUND_STORE__ = {
      cases,
      auditLog: [
        {
          id: `audit_init_${Date.now()}`,
          case_id: "SYSTEM",
          timestamp: new Date().toISOString(),
          stage: "DETECT",
          message: `Simulated Payment Operations Store initialized with ${cases.size} cases (Seed: ${DEFAULT_CONFIG.seed}, Difficulty: ${DEFAULT_CONFIG.difficulty})`,
          status: "INFO",
        },
      ],
      config: { ...DEFAULT_CONFIG },
      isInitialized: true,
    };
  }
  return globalThis.__REFUND_STORE__;
}

export const RefundStore = {
  getAllCases(): RefundCase[] {
    const store = getStore();
    return Array.from(store.cases.values());
  },

  getCase(caseId: string): RefundCase | undefined {
    const store = getStore();
    return store.cases.get(caseId);
  },

  updateCase(updatedCase: RefundCase): void {
    const store = getStore();
    store.cases.set(updatedCase.case_id, updatedCase);
  },

  getAuditLog(): AuditLogEntry[] {
    const store = getStore();
    return [...store.auditLog].reverse(); // newest first
  },

  addAuditEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const store = getStore();
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    store.auditLog.push(fullEntry);
    // keep max 1000 entries
    if (store.auditLog.length > 1000) {
      store.auditLog.shift();
    }
    return fullEntry;
  },

  getConfig(): SimulatorConfig {
    return { ...getStore().config };
  },

  updateConfig(partial: Partial<SimulatorConfig>): SimulatorConfig {
    const store = getStore();
    store.config = { ...store.config, ...partial };
    return { ...store.config };
  },

  resetDataset(seed?: number, difficulty?: "easy" | "normal" | "ambiguous", count?: number): RefundCase[] {
    const store = getStore();
    const newSeed = seed !== undefined ? seed : store.config.seed;
    const newDifficulty = difficulty || store.config.difficulty;
    const newCount = count || store.config.count;

    store.config.seed = newSeed;
    store.config.difficulty = newDifficulty;
    store.config.count = newCount;

    store.cases.clear();
    const dataset = generateRefundDataset(store.config);
    for (const c of dataset) {
      store.cases.set(c.case_id, c);
    }

    this.addAuditEntry({
      case_id: "SYSTEM",
      stage: "DETECT",
      message: `Regenerated dataset with seed ${newSeed}, difficulty: ${newDifficulty} (${dataset.length} cases loaded)`,
      status: "INFO",
    });

    return Array.from(store.cases.values());
  },
};
