# Scope 001 — Soroban policy and attestation contract

## Goal

Build the first production-shaped Soroban artifact for Saksi: a policy registry that enforces hard credit limits and an attestation log for every underwriting decision. No money movement and no custody in this scope.

## Why this first

- It is the core differentiator: the chain enforces policy the AI cannot cross.
- It is small enough to test exhaustively.
- It gives the SCF submission a real testnet artifact and tx hash.

## In scope

Contract crate: `contracts/saksi`

### State

- Admin address.
- Underwriter address.
- `Policy`:
  - `max_single_invoice: i128`
  - `max_debtor_exposure: i128`
  - `min_discount_bps: u32`
  - `max_discount_bps: u32`
- `Invoice`:
  - `id: BytesN<32>`
  - `debtor: Address`
  - `amount: i128`
  - `discount_bps: u32`
  - `status: InvoiceStatus` (`Registered`, `Decisioned`, `Released`)
  - `decision_hash: Option<BytesN<32>>`
  - `approved: Option<bool>`
- Per-debtor exposure.

### Entry points

- `__constructor(admin, underwriter)`
- `set_policy(admin, policy)` — validates and stores policy.
- `register_invoice(underwriter, invoice_id, debtor, amount, discount_bps)` — reserves exposure and enforces caps.
- `attest_decision(underwriter, invoice_id, decision_hash, approved)` — anchors the decision; releases exposure when rejected.
- `release_invoice(admin, invoice_id)` — admin-only release for an approved but unfunded invoice.
- `set_admin(admin, new_admin)` and `set_underwriter(admin, new_underwriter)` — evented key rotation.
- Reads: `get_policy`, `get_invoice`, `get_debtor_exposure`, `verify_decision`.

### Errors

Explicit typed errors for: not initialized, invalid policy, invalid amount, discount out of band, single-invoice cap, debtor exposure cap, duplicate invoice, missing invoice, already attested, invalid state.

### Events

Emit for policy set, invoice registered, decision attested, exposure released.

## Out of scope

- Token transfers, pool custody, funding, repayment.
- KYC, documents, personal data.
- x402, MCP, API, UI.
- Mainnet deployment.

## Acceptance criteria

- Policy cannot be bypassed by any caller.
- Only the underwriter can register and attest.
- Only the admin can set policy.
- Exposure is reserved on registration and released on rejection or explicit release.
- A duplicate invoice cannot be registered.
- An invoice cannot be attested twice.
- A decision hash cannot be reused across invoices.
- TTL is extended on access/write so policy and attestations stay available.
- Auth is negatively tested without mock_all_auths.
- `verify_decision` returns true only for the stored hash.
- All errors are explicit and tested.
- `cargo test` passes.
- `cargo clippy -- -D warnings` passes.
- `stellar contract build` produces a wasm artifact.

## Required tests

1. Constructor sets roles.
2. Set policy rejects invalid bands, zero amounts, and inverted caps.
3. Register within limits succeeds and increases exposure.
4. Register above single-invoice cap fails.
5. Register above debtor exposure cap fails.
6. Register below/above discount band fails.
7. Duplicate invoice fails.
8. Unauthorized register fails.
9. Attest decision stores hash and marks approved.
10. Rejected decision releases exposure.
11. Double attestation fails.
12. Release invoice releases exposure once.
13. Verify decision true/false.
14. Unauthorized attest fails.
15. Unknown invoice read returns None and verify_decision returns false.
16. Non-admin cannot set policy or release; non-underwriter cannot register or attest.
17. Admin and underwriter rotation works and old keys lose access.
18. Decision hash reuse across invoices is rejected.
19. Auth failures occur when auths are not mocked.

## Risks

- Exposure accounting drift if approval/release paths are inconsistent.
- Hash canonicalization ambiguity; the API must define the memo format.
- Auth assumptions: `require_auth` must be on every mutating path.
- Future funding logic could accidentally reintroduce custody; keep it out.

## Reviewers required

- `contracts-reviewer`: correctness, invariants, tests.
- `security-auditor`: auth, replay, policy bypass, compromised underwriter key.
- `qa-validator`: reproduce tests and build.

## Evidence

- Test output.
- Clippy output.
- Wasm build output.
- File paths and line references in the validation log.
