/**
 * Server-only Razorpay API Client.
 * Communicates with Razorpay Test / Live API endpoints.
 */

export class RazorpayClient {
  private keyId: string | null;
  private keySecret: string | null;
  private baseUrl: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || null;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || null;
    this.baseUrl = "https://api.razorpay.com/v1";
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  private getAuthHeader(): string {
    if (!this.keyId || !this.keySecret) {
      throw new Error("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not configured.");
    }
    return "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");
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
        error: "Razorpay credentials not configured in environment.",
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
