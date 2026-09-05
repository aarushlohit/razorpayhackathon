export interface RazorpayPaymentItem {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id?: string;
  invoice_id?: string;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status?: "null" | "partial" | "full";
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email?: string;
  contact?: string;
  customer_id?: string;
  notes?: Record<string, any>;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  created_at: number;
}

export interface RazorpayRefundItem {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  notes?: Record<string, string>;
  receipt?: string;
  acquirer_data?: {
    arn?: string;
    rrn?: string;
    auth_code?: string;
  };
  created_at: number;
  batch_id?: string;
  status: "pending" | "processed" | "failed";
  speed_processed?: "normal" | "optimum";
  speed_requested?: "normal" | "optimum";
}

export interface RazorpayWebhookEvent {
  entity: "event";
  account_id: string;
  event:
    | "payment.authorized"
    | "payment.failed"
    | "payment.captured"
    | "refund.created"
    | "refund.processed"
    | "refund.failed"
    | "refund.speed_changed";
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPaymentItem;
    };
    refund?: {
      entity: RazorpayRefundItem;
    };
  };
  created_at: number;
}
