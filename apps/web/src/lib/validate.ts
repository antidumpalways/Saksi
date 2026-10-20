export function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

export function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

export function isDebtorId(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,127}$/.test(value);
}

export function validateInvoiceForm(input: {
  invoiceId: string;
  debtor: string;
  amount: string;
  discountBps: string;
}): string | null {
  if (!isHex64(input.invoiceId)) return "Invoice id must be 64 hex characters.";
  if (!isDebtorId(input.debtor)) return "Debtor id must be a lowercase slug.";
  if (!isPositiveInteger(input.amount)) return "Amount must be a positive integer.";
  if (!/^\d+$/.test(input.discountBps)) return "Discount must be an integer between 0 and 10000.";
  const discount = Number(input.discountBps);
  if (!Number.isInteger(discount) || discount < 0 || discount > 10_000) {
    return "Discount must be an integer between 0 and 10000.";
  }
  return null;
}

export function validatePolicyForm(input: {
  maxSingleInvoice: string;
  maxDebtorExposure: string;
  minDiscountBps: string;
  maxDiscountBps: string;
}): string | null {
  if (!isPositiveInteger(input.maxSingleInvoice)) return "Single cap must be a positive integer.";
  if (!isPositiveInteger(input.maxDebtorExposure)) return "Debtor cap must be a positive integer.";
  if (!/^\d+$/.test(input.minDiscountBps) || !/^\d+$/.test(input.maxDiscountBps)) {
    return "Discount bands must be integers between 0 and 10000.";
  }
  const min = Number(input.minDiscountBps);
  const max = Number(input.maxDiscountBps);
  if (!Number.isInteger(min) || min < 0 || min > 10_000) return "Min discount is invalid.";
  if (!Number.isInteger(max) || max < 0 || max > 10_000) return "Max discount is invalid.";
  if (min > max) return "Min discount must not exceed max discount.";
  if (BigInt(input.maxSingleInvoice) > BigInt(input.maxDebtorExposure)) {
    return "Single cap must not exceed debtor exposure cap.";
  }
  return null;
}

export function validateDecisionForm(input: {
  score: string;
  priceBps: string;
  promptHash: string;
  inputsHash: string;
  nonce: string;
}): string | null {
  if (!/^\d+$/.test(input.score)) return "Score must be 0-100.";
  const score = Number(input.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) return "Score must be 0–100.";
  if (!/^\d+$/.test(input.priceBps)) return "Price must be 0-10000 bps.";
  const price = Number(input.priceBps);
  if (!Number.isInteger(price) || price < 0 || price > 10_000) return "Price must be 0–10000 bps.";
  if (!isHex64(input.promptHash)) return "Prompt hash must be 64 hex characters.";
  if (!isHex64(input.inputsHash)) return "Inputs hash must be 64 hex characters.";
  if (input.nonce.length < 8) return "Nonce must be at least 8 characters.";
  return null;
}
