export interface Policy {
  maxSingleInvoice: string;
  maxDebtorExposure: string;
  minDiscountBps: number;
  maxDiscountBps: number;
}

export type InvoiceStatus = "registered" | "approved" | "rejected" | "released";

export interface Invoice {
  id: string;
  debtor: string;
  amount: string;
  discountBps: number;
  status: InvoiceStatus;
  decisionHash: string | null;
  approved: boolean | null;
  createdAt: string;
}

export interface Decision {
  invoiceId: string;
  decisionHash: string;
  approved: boolean;
  memo: Record<string, unknown>;
  createdAt: string;
}

export interface PoolStats {
  policy: Policy | null;
  totalExposure: string;
  invoiceCount: number;
  approvedCount: number;
  verifiedCount: number;
}

export interface InvoiceList {
  invoices: Invoice[];
}
