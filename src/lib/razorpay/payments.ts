import { RazorpayClient, razorpayClient } from "./client";
import type { RazorpayPaymentItem } from "./types";

export async function fetchRazorpayPayment(
  paymentId: string,
  options?: { workspaceId?: string; client?: RazorpayClient }
): Promise<{
  success: boolean;
  payment?: RazorpayPaymentItem;
  error?: string;
}> {
  const client =
    options?.client ||
    (options?.workspaceId ? RazorpayClient.forWorkspace(options.workspaceId) : razorpayClient);

  const res = await client.request<RazorpayPaymentItem>(`/payments/${paymentId}`, {
    method: "GET",
  });

  if (res.data && res.status === 200) {
    return { success: true, payment: res.data };
  }

  return {
    success: false,
    error: res.error || "Payment not found in connected Razorpay account.",
  };
}
