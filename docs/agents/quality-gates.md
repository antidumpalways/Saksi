# Quality Gates

All gates must be PASS before the orchestrator signs off. A gate can be WAIVED only with a written reason and a human decision.

## G1 — Build

- [ ] Repository builds from a clean checkout.
- [ ] Lockfile committed.
- [ ] No secrets in the repo.
- [ ] Environment variables documented in `.env.example`.

## G2 — Tests

- [ ] Unit tests pass.
- [ ] Contract tests pass (`cargo test`).
- [ ] Integration tests pass for API and x402 verification.
- [ ] Test output is attached as evidence.

## G3 — Contract correctness

- [ ] Policy caps cannot be bypassed by any caller.
- [ ] Attestation hash covers the full memo defined in `docs/architecture/decision-memo.md`; on-chain content binding is verified off-chain and documented.
- [ ] Funding and repayment cannot double-spend.
- [ ] Default/write-off path is authorized and tested.
- [ ] Error types are explicit and mapped in the UI.

## G4 — Stellar integration

- [ ] USDC issuer and network are correct.
- [ ] Transaction verification checks amount, asset, destination, memo, and success.
- [ ] Testnet tx hashes are reproducible.
- [ ] SEP/asset handling is documented.
- [ ] x402 flow rejects unpaid or underpaid requests.

## G5 — Security

- [ ] Threat model documented.
- [ ] Keys are separated by role and least privilege.
- [ ] Rate limits, idempotency, and replay protection exist.
- [ ] No custody of user funds.
- [ ] No prompt can exceed on-chain policy.
- [ ] Abuse cases covered: oversized invoice, duplicate invoice, replayed tx, forged receipt.

## G6 — Frontend

- [ ] Original layout, copy, colors, icons, and assets.
- [ ] No Faktura screenshots, text, or assets.
- [ ] Accessible: keyboard, contrast, labels.
- [ ] Empty, loading, error, and rejected states exist.
- [ ] Every on-chain action shows a verifiable receipt.

## G7 — Evidence

- [ ] Every claim maps to a file, command, tx hash, or URL.
- [ ] Demo video matches the current build.
- [ ] README reproduces the demo in under 10 minutes.
- [ ] No placeholder claims presented as facts.

## G8 — SCF fit and originality

- [ ] Product is not a clone of an existing SCF project.
- [ ] Differentiation from Airswift, Bunkr, Pelago, and Agama is explicit.
- [ ] Applicant is 18+.
- [ ] Target markets and local-rail answers are accurate.
- [ ] Interest form, website, and repo are consistent.
- [ ] Any third-party inspiration or MIT-derived code is disclosed with attribution.
