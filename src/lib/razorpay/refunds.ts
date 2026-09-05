import { razorpayClient } from "./client";
import type { RazorpayRefundItem } from "./types";

export async function fetchRazorpayRefund(refundId: string): Promise<{
  success: boolean;
  refund?: RazorpayRefundItem;
  error?: string;
}> {
  const res = await razorpayClient.request<RazorpayRefundItem>(`/refunds/${refundId}`, {
    method: "GET",
  });

  if (res.data && res.status === 200) {
    return { success: true, refund: res.data };
  }

  return { success: false, error: res.error || "Refund not found." };
}

export async function createRazorpayRefund(
  paymentId: string,
  options: {
    amountCents?: number;
    notes?: Record<string, string>;
    speed?: "normal" | "optimum";
  } = {}
): Promise<{
  success: boolean;
  refund?: RazorpayRefundItem;
  error?: string;
}> {
  const body: Record<string, any> = {};
  if (options.amountCents) body.amount = options.amountCents;
  if (options.notes) body.notes = options.notes;
  if (options.speed) body.speed = options.speed;

  const res = await razorpayClient.request<RazorpayRefundItem>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body,
  });

  if (res.data && (res.status === 200 || res.status === 201)) {
    return { success: true, refund: res.data };
  }

  return { success: false, error: res.error || "Refund creation failed." };
}
