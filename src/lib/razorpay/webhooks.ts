import crypto from "crypto";
import type { RazorpayWebhookEvent } from "./types";

/**
 * Validates Razorpay Webhook cryptographic signature (HMAC SHA-256).
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!rawBody || !signature || !secret) return false;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

export function parseWebhookEvent(rawBody: string): RazorpayWebhookEvent | null {
  try {
    return JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return null;
  }
}
