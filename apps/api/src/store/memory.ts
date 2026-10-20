import type { DecisionRecord, Invoice, Policy } from "../domain/types";

export class MemoryStore {
  private policy?: Policy;
  private readonly invoices = new Map<string, Invoice>();
  private readonly decisions = new Map<string, DecisionRecord>();
  private readonly decisionsByHash = new Map<string, string>();
  private readonly nonces = new Set<string>();
  private readonly exposure = new Map<string, bigint>();

  setPolicy(policy: Policy): void {
    this.policy = policy;
  }

  getPolicy(): Policy | undefined {
    return this.policy;
  }

  getInvoice(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  hasInvoice(id: string): boolean {
    return this.invoices.has(id);
  }

  putInvoice(invoice: Invoice): void {
    this.invoices.set(invoice.id, invoice);
  }

  getDecision(invoiceId: string): DecisionRecord | undefined {
    return this.decisions.get(invoiceId);
  }

  findInvoiceByDecisionHash(hash: string): string | undefined {
    return this.decisionsByHash.get(hash);
  }

  putDecision(record: DecisionRecord): void {
    this.decisions.set(record.invoiceId, record);
    this.decisionsByHash.set(record.decisionHash, record.invoiceId);
  }

  listInvoices(): Invoice[] {
    return [...this.invoices.values()];
  }

  totalExposure(): bigint {
    let total = 0n;
    for (const value of this.exposure.values()) {
      total += value;
    }
    return total;
  }

  hasNonce(nonce: string): boolean {
    return this.nonces.has(nonce);
  }

  putNonce(nonce: string): void {
    this.nonces.add(nonce);
  }

  getExposure(debtor: string): bigint {
    return this.exposure.get(debtor) ?? 0n;
  }

  setExposure(debtor: string, value: bigint): void {
    this.exposure.set(debtor, value);
  }
}
