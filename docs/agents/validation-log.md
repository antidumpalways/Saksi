# Validation Log

Append-only. Every validation cycle adds one entry. Do not rewrite history.

## Template

```
## YYYY-MM-DD — <scope>
Cycle: <n>
Builder: <agent>
Risk: LOW | MEDIUM | HIGH
Artifact: <paths / tx / URL>

Reviewers:
- <agent>: PASS | FAIL | ESCALATE — <evidence summary>
- <agent>: PASS | FAIL | ESCALATE — <evidence summary>

Findings:
- [SEVERITY] <file:line or tx> — <issue> — <required fix>

Arbiter:
- verdict:
- reason:

Orchestrator:
- status: DONE | BLOCKED | ESCALATED
- gates: G1..G8
- next:
```

## Entry 000 — bootstrap

Cycle: 0
Builder: none
Risk: LOW
Artifact: repository scaffolding and agent protocol

Reviewers:
- not yet run

Findings:
- none

Arbiter:
- not required

Orchestrator:
- status: BLOCKED (no product artifact yet)
- gates: G1–G8 not evaluated
- next: create the first scoped artifact (Soroban policy contract or API skeleton) and run `/validate`

## 2026-10-19 — Scope 001 policy and attestation contract

Cycle: 1–3
Builder: builder
Risk: HIGH
Artifact: `contracts/saksi/src/lib.rs`, `contracts/saksi/src/test.rs`

Reviewers:
- contracts-reviewer: FAIL (cycle 1) — TTL incomplete, rejection event missing, auth tests non-discriminating, error mapping weak.
- security-auditor: PASS with MEDIUM findings — release role, hash binding, role rotation, TTL reads.
- contracts-reviewer: PASS (cycle 2) after fixes.
- arbiter: FAIL (cycle 2) — auth-negative attest targeted an unregistered invoice.
- arbiter: PASS (cycle 3) — fix verified, 25 tests, clippy clean.

Findings resolved:
- [HIGH] instance TTL + role/policy/decision TTL bumps added.
- [MEDIUM] rejection emits `ExposureReleased`.
- [MEDIUM] auth-negative test seeds valid state and is discriminating.
- [MEDIUM] typed errors asserted for InvalidPolicy, SingleInvoiceCapExceeded, AlreadyAttested, DecisionHashReused.
- [MEDIUM] `release_invoice` is admin-only.
- [MEDIUM] admin != underwriter enforced; rotation guards tested.
- [LOW] `saturating_sub` replaced with `checked_sub`.
- [LOW] decision hash reuse rejected; content-binding limit documented in `docs/architecture/decision-memo.md`.

Remaining non-blocking:
- Aggregate exposure across many debtor addresses is not capped on-chain; must be enforced off-chain or by a future global cap.
- Decision content binding is verified off-chain; the contract stores a unique hash-to-invoice mapping only.
- Event payloads are not asserted in tests.
- Read-only entry points do not all call `touch()`.

Evidence:
- `cargo test`: 25 passed, 0 failed.
- `cargo clippy --all-targets -- -D warnings`: pass.
- `stellar contract build`: wasm `2d31139659d3bb988a946f7415b27978f2b2835ebf48c4f78e540d2c88fc16a3`, 11 exports.

Orchestrator:
- status: DONE for Scope 001
- gates: G1 PASS, G2 PASS, G3 PASS (scoped), G5 PASS, G7 PASS; G4/G6/G8 N/A for this artifact.
- next: API skeleton + USDC/x402 verification + MCP server; then testnet deploy and landing page.

## 2026-10-19 — Scope 002 API skeleton

Cycle: 1–2
Builder: builder
Risk: HIGH
Artifact: `apps/api/src` (Fastify API, policy engine, canonical memo, in-memory store, tests)

Reviewers:
- api-reviewer: FAIL (cycle 1) — case-variant invoice duplicate, debtor alias exposure bypass, missing tests.
- security-auditor: FAIL (cycle 1) — auth bypass via encoded/absolute URL, GET exemption, duplicate/debtor alias, backdated memo, nonce reuse, unauthenticated reads.
- security-auditor: PASS (cycle 2) — all 8 blockers fixed; residual MEDIUM fixed afterward.

Findings resolved:
- [BLOCKER] auth moved to `preHandler` using `request.routeOptions.url`, default-deny except `/health`, constant-time key comparison.
- [BLOCKER] GET exemption removed; reads now require auth.
- [HIGH] invoice id normalized before duplicate check and storage.
- [HIGH] debtor id restricted to a canonical lowercase slug.
- [MEDIUM] server time used for memo; client timestamps removed.
- [MEDIUM] nonce uniqueness enforced.
- [MEDIUM] approved decisions revalidated against current policy; rejection still allowed and releases exposure.
- [LOW] exposure reads reject non-canonical debtor ids.

Remaining non-blocking:
- One global API key, no tenant separation or rotation.
- In-memory store and nonce set are process-local; production needs Postgres with durable unique constraints.
- x402, MCP, and on-chain submission are not implemented yet.

Evidence:
- `pnpm test`: 20 passed.
- `pnpm typecheck`: pass.

Orchestrator:
- status: DONE for Scope 002
- gates: G1 PASS, G2 PASS, G5 PASS, G7 PASS; G3/G4/G6/G8 N/A for this artifact.
- next: x402 USDC verification + MCP server, then testnet deployment and landing page.

## 2026-10-19 — Scope 003 x402 and MCP

Cycle: 1–2
Builder: builder
Risk: HIGH
Artifact: `apps/api/src/x402/*`, `apps/api/src/routes/x402.ts`, `apps/api/src/server.ts`, `apps/mcp/src/*`

Reviewers:
- x402/MCP reviewer: FAIL (cycle 1) — server wiring missing, non-standard requirement format, volatile replay.
- x402/MCP reviewer: PASS (cycle 2) — blockers resolved; residual MEDIUM/LOW hardening items.

Findings resolved:
- [BLOCKER] server now builds x402 config, `StellarPaymentVerifier`, and `FileReplayStore` from env.
- [HIGH] amount is atomic units, network is CAIP-2, resource is absolute, memo binds SHA-256(invoiceId).
- [HIGH] replay uses atomic file creation and proof age is bounded.
- [MEDIUM] tx hash canonicalized; verifier uses requirement fields; fetch timeouts added.
- [MEDIUM] tests added for verifier success/underpay/memo/expiry and replay claim.
- [LOW] MCP validates 64-hex ids and lowercases hash comparison.

Remaining non-blocking:
- x402 env values are not schema-validated at startup; invalid timeout can disable the freshness bound.
- Horizon network passphrase is not cross-checked.
- Future-dated `created_at` is not rejected.
- Replay files are not pruned or fsynced.
- MCP has no runtime tests; typecheck only.

Evidence:
- `pnpm test`: 28 passed.
- `pnpm typecheck`: API and MCP pass.
- Docs: `docs/architecture/x402.md`.

Orchestrator:
- status: DONE for Scope 003
- gates: G1 PASS, G2 PASS, G4 PASS (test-covered), G5 PASS, G7 PASS; G6/G8 N/A.
- next: validate x402 env at startup, then deploy contract to testnet and build the landing page.

## 2026-10-20 — Scope 004 web UI

Cycle: 1–2
Builder: builder
Risk: HIGH
Artifact: `apps/web/src` (Next.js app router, Tailwind, server-side API proxy)

Reviewers:
- web reviewer: FAIL (cycle 1) — unauthenticated privileged proxy, false on-chain claims, missing validation/states/a11y.
- web reviewer: PASS (cycle 2) — blockers resolved; residual MEDIUM/LOW fixed afterward.

Findings resolved:
- [HIGH] Basic auth middleware + independent proxy check; API key confirmed absent from client bundle.
- [HIGH] removed present-tense on-chain/testnet/anchored claims; copy now says pre-deployment and ready-to-anchor.
- [MEDIUM] client validation for invoice, policy, decision forms.
- [MEDIUM] API error messages include message/issues; loading/error/empty states separated.
- [MEDIUM] random values generated after mount; no hydration mismatch.
- [MEDIUM] decision form labeled manual demo input; no fake AI provenance.
- [MEDIUM] aria-pressed, aria-labels, role=alert, aria-current, mobile nav active state.
- [LOW] overview invoices error/loading, 404 vs transport error, empty numeric validation, metadata/README tense.

Remaining non-blocking:
- Basic auth is a single shared operator credential; no per-user session or tenant isolation.
- No CSRF token beyond JSON preflight; add if cookies are introduced.
- The UI does not run the real risk engine; it records operator-entered demo decisions.

Evidence:
- `pnpm typecheck`: API, MCP, web pass.
- `pnpm --filter @saksi/web build`: pass; 6 routes + middleware.
- `pnpm test`: 28 API tests pass.
- Client bundle scan: no `SAKSI_API_KEY`, `x-api-key`, or web password.

Orchestrator:
- status: DONE for Scope 004
- gates: G1 PASS, G2 PASS, G6 PASS, G7 PASS; G3/G4/G5 partial (covered by earlier scopes), G8 N/A.
- next: deploy the contract to Stellar testnet, record tx hashes, then landing page and SCF form.
