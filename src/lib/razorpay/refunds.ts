import { RazorpayClient, razorpayClient } from "./client";
import type { RazorpayRefundItem } from "./types";

export async function fetchRazorpayRefund(
  refundId: string,
  options?: { workspaceId?: string; client?: RazorpayClient }
): Promise<{
  success: boolean;
  refund?: RazorpayRefundItem;
  error?: string;
}> {
  const client =
    options?.client ||
    (options?.workspaceId ? RazorpayClient.forWorkspace(options.workspaceId) : razorpayClient);

  const res = await client.request<RazorpayRefundItem>(`/refunds/${refundId}`, {
    method: "GET",
  });

  if (res.data && res.status === 200) {
    return { success: true, refund: res.data };
  }

  return { success: false, error: res.error || "Refund not found in connected Razorpay account." };
}

export async function createRazorpayRefund(
  paymentId: string,
  options: {
    amountCents?: number;
    notes?: Record<string, string>;
    speed?: "normal" | "optimum";
    workspaceId?: string;
    client?: RazorpayClient;
  } = {}
): Promise<{
  success: boolean;
  refund?: RazorpayRefundItem;
  error?: string;
}> {
  const client =
    options.client ||
    (options.workspaceId ? RazorpayClient.forWorkspace(options.workspaceId) : razorpayClient);

  const body: Record<string, any> = {};
  if (options.amountCents) body.amount = options.amountCents;
  if (options.notes) body.notes = options.notes;
  if (options.speed) body.speed = options.speed;

  const res = await client.request<RazorpayRefundItem>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body,
  });

  if (res.data && (res.status === 200 || res.status === 201)) {
    return { success: true, refund: res.data };
  }

  return { success: false, error: res.error || "Refund creation failed." };
}

export async function fetchPaymentRefunds(
  paymentId: string,
  options?: { workspaceId?: string; client?: RazorpayClient }
): Promise<{
  success: boolean;
  refunds: RazorpayRefundItem[];
  error?: string;
}> {
  const client =
    options?.client ||
    (options?.workspaceId ? RazorpayClient.forWorkspace(options.workspaceId) : razorpayClient);

  const res = await client.request<{ count: number; items: RazorpayRefundItem[] }>(
    `/payments/${paymentId}/refunds`,
    { method: "GET" }
  );

  if (res.data && res.status === 200) {
    return { success: true, refunds: res.data.items || [] };
  }

  return { success: false, refunds: [], error: res.error };
}
