# Decision Memo v1

The contract stores only a 32-byte hash. The API must produce the canonical memo below, hash it, and store the hash on-chain. Anyone can recompute it and compare with `verify_decision`.

## Canonical JSON

Use JSON Canonicalization Scheme (JCS, RFC 8785). Hash with SHA-256. Encode the digest as 32 raw bytes and submit as `BytesN<32>`.

```json
{
  "version": "saksi.decision.v1",
  "invoice_id": "<64 hex chars>",
  "debtor": "<stellar account address>",
  "amount": "<i128 as decimal string>",
  "discount_bps": 300,
  "policy_hash": "<sha256 of canonical policy>",
  "decision": "approve",
  "score": 82,
  "price_bps": 250,
  "model": "provider/model-id",
  "prompt_hash": "<sha256>",
  "inputs_hash": "<sha256>",
  "nonce": "<uuid v4>",
  "created_at": "<RFC3339 UTC>"
}
```

## Binding rules

- `invoice_id`, `debtor`, `amount`, and `discount_bps` must match the on-chain invoice.
- `decision` must match the `approved` boolean.
- `policy_hash` must match the policy active at decision time.
- `nonce` must be unique per decision.
- The API must persist the full memo and return it with the receipt.

## On-chain limits

Soroban cannot parse and recompute JSON. The contract enforces:

- uniqueness of the decision hash across invoices;
- a hash-to-invoice mapping;
- `verify_decision(invoice_id, hash)` returns true only for the stored pair.

Content binding is verified off-chain by recomputing the memo hash. The API and the audit UI must perform this check and display the result. Do not claim that the contract alone verifies the memo content.
