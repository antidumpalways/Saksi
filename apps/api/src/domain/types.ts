export type InvoiceStatus = "registered" | "approved" | "rejected" | "released";

export interface Policy {
  maxSingleInvoice: bigint;
  maxDebtorExposure: bigint;
  minDiscountBps: number;
  maxDiscountBps: number;
}

export interface Invoice {
  id: string;
  debtor: string;
  amount: bigint;
  discountBps: number;
  status: InvoiceStatus;
  policyHash: string;
  decisionHash?: string;
  approved?: boolean;
  createdAt: string;
}

export interface DecisionRecord {
  invoiceId: string;
  decisionHash: string;
  approved: boolean;
  memo: Record<string, unknown>;
  createdAt: string;
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
