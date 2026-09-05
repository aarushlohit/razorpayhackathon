import { razorpayClient } from "./client";
import type { RazorpayPaymentItem } from "./types";

export async function fetchRazorpayPayment(paymentId: string): Promise<{
  success: boolean;
  payment?: RazorpayPaymentItem;
  error?: string;
}> {
  const res = await razorpayClient.request<RazorpayPaymentItem>(`/payments/${paymentId}`, {
    method: "GET",
  });

  if (res.data && res.status === 200) {
    return { success: true, payment: res.data };
  }

  return { success: false, error: res.error || "Payment not found." };
}
