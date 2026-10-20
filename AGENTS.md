# Saksi

Session memory: read `docs/context/project-brief.md` before starting work. It records the decisions, constraints, current status, and next steps.

Saksi is credit infrastructure for RWA lenders on Stellar. It is not an invoice marketplace and it does not compete with Airswift, Bunkr, or Pelago. Saksi is the policy, underwriting, and attestation layer those lenders can integrate.

## Product invariants

- Saksi never custodies funds and never lends.
- The lender keeps its license, KYC, and collections process.
- The AI is advisory. Deterministic policy is authoritative.
- Every approval and rejection must be anchorable on Soroban.
- x402 risk reports settle in USDC on Stellar.
- The MCP server must expose the same pipeline the UI uses.

## Stack

- Monorepo: pnpm + turborepo
- Web: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query
- API: Fastify, TypeScript, zod, Drizzle ORM, PostgreSQL, Redis
- Contracts: Rust, soroban-sdk, stellar-cli
- Risk engine: TypeScript or Python service, schema-validated LLM output
- x402: HTTP 402 + USDC verification on Stellar
- MCP: @modelcontextprotocol/sdk
- Infra: GitHub Actions, Vercel, Fly.io/Railway, Sentry

## Non-negotiable rules

1. Original work only. Never copy code, UI, copywriting, assets, names, or branding from Faktura or any other project. General ideas and public standards are allowed.
2. No false claims. Traction, users, TVL, audits, and partnerships must be real and evidenced.
3. Every artifact needs evidence: file path, command run, test output, tx hash, or URL.
4. No self-approval. A builder cannot approve their own work.
5. Two-reviewer rule. High-risk changes need two independent reviewers.
6. A task is not done until the orchestrator signs off after all quality gates pass.
7. The applicant must be 18+. Minors may contribute informally but cannot be the applicant or KYC subject.

## Validation loop

Builder -> Contracts Reviewer + Security Auditor -> Stellar Integration Reviewer + SCF Reviewer -> QA Validator -> Arbiter (if disagreement) -> Orchestrator sign-off.

See `docs/agents/validation-protocol.md` and `docs/agents/quality-gates.md`.

## Commands

- `/validate` runs the full validation loop for the current change.
- `/gate` checks the quality gates and returns PASS/FAIL per gate.
- `/handoff` produces a handoff record for the next reviewer.

## Definition of done

All gates PASS, evidence is linked, no unmitigated high-severity findings, and the SCF reviewer confirms the claim is accurate and original.
