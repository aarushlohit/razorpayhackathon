import { Database } from "../db";
import { decryptSecret } from "../security/encryption";
import type { IntegrationMode } from "@/types";

/**
 * Server-only Razorpay API Client.
 * Communicates with Razorpay Test / Live API endpoints using workspace-scoped or supplied credentials.
 */

export interface RazorpayClientConfig {
  keyId: string;
  keySecret: string;
  mode?: IntegrationMode;
}

export class RazorpayClient {
  public readonly keyId: string | null;
  private readonly keySecret: string | null;
  public readonly mode: IntegrationMode;
  public readonly baseUrl: string;

  constructor(config?: RazorpayClientConfig) {
    this.keyId = config?.keyId || process.env.RAZORPAY_KEY_ID || null;
    this.keySecret = config?.keySecret || process.env.RAZORPAY_KEY_SECRET || null;
    this.mode = config?.mode || (this.keyId?.startsWith("rzp_live") ? "live" : "test");
    this.baseUrl = "https://api.razorpay.com/v1";
  }

  /**
   * Factory method to dynamically instantiate client for a specific workspace.
   * Resolves workspace-level encrypted credentials with fallback to env.
   */
  public static forWorkspace(workspaceId: string): RazorpayClient {
    const integration = Database.getIntegration(workspaceId, "razorpay");
    if (integration && integration.encrypted_key_secret) {
      try {
        const decryptedSecret = decryptSecret(integration.encrypted_key_secret);
        return new RazorpayClient({
          keyId: integration.key_id,
          keySecret: decryptedSecret,
          mode: integration.mode,
        });
      } catch (err) {
        console.error(`[RazorpayClient] Failed to decrypt credentials for workspace ${workspaceId}:`, err);
      }
    }

    // Fallback to environment variables if configured
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      return new RazorpayClient({
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        mode: process.env.RAZORPAY_KEY_ID.startsWith("rzp_live") ? "live" : "test",
      });
    }

    return new RazorpayClient(); // Unconfigured client
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  private getAuthHeader(): string {
    if (!this.keyId || !this.keySecret) {
      throw new Error("Razorpay credentials not configured.");
    }
    return "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
  }

  /**
   * Validates Razorpay credentials by calling a lightweight read-only endpoint (GET /payments?count=1).
   */
  public static async validateCredentials(
    keyId: string,
    keySecret: string
  ): Promise<{
    valid: boolean;
    status: "CONNECTED" | "INVALID_CREDENTIALS" | "CONNECTION_FAILED" | "PROVIDER_ERROR";
    message: string;
    mode: IntegrationMode;
    httpStatus?: number;
  }> {
    if (!keyId || !keySecret) {
      return {
        valid: false,
        status: "INVALID_CREDENTIALS",
        message: "Key ID and Key Secret are required.",
        mode: "test",
      };
    }

    const mode: IntegrationMode = keyId.startsWith("rzp_live") ? "live" : "test";
    const authHeader = "Basic " + Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64");

    try {
      const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "User-Agent": "RefundLoop/1.0 (Razorpay Buildathon)",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 200) {
        return {
          valid: true,
          status: "CONNECTED",
          message: `Razorpay ${mode === "live" ? "Live" : "Test"} Mode connection validated successfully.`,
          mode,
          httpStatus: 200,
        };
      }

      if (res.status === 401) {
        return {
          valid: false,
          status: "INVALID_CREDENTIALS",
          message: "Authentication failed. The provided Key ID or Key Secret is invalid.",
          mode,
          httpStatus: 401,
        };
      }

      const text = await res.text();
      let description = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error?.description) description = parsed.error.description;
      } catch {
        // use default
      }

      return {
        valid: false,
        status: "PROVIDER_ERROR",
        message: `Razorpay API responded with an error: ${description}`,
        mode,
        httpStatus: res.status,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "TimeoutError" || err?.message?.includes("timed out");
      return {
        valid: false,
        status: "CONNECTION_FAILED",
        message: isTimeout
          ? "Connection timed out while reaching Razorpay API."
          : "Network connection failed. Could not reach api.razorpay.com.",
        mode,
      };
    }
  }

  public async request<T = any>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "PUT";
      body?: Record<string, any>;
      timeoutMs?: number;
    } = {}
  ): Promise<{ status: number; data: T | null; error?: string }> {
    if (!this.isConfigured()) {
      return {
        status: 401,
        data: null,
        error: "RAZORPAY_NOT_CONFIGURED: Workspace integration or credentials not configured.",
      };
    }

    const { method = "GET", body, timeoutMs = 8000 } = options;
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
          "User-Agent": "RefundLoop/1.0 (Razorpay Buildathon)",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const responseText = await res.text();
      let responseData: any = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!res.ok) {
        return {
          status: res.status,
          data: null,
          error: responseData?.error?.description || `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      return {
        status: res.status,
        data: responseData as T,
      };
    } catch (err: any) {
      return {
        status: 500,
        data: null,
        error: err?.message || "Razorpay API request failed due to network error.",
      };
    }
  }
}

export const razorpayClient = new RazorpayClient();
