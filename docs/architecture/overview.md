# Saksi Architecture Overview

## Product

Saksi is a policy, underwriting, and attestation layer for RWA lenders on Stellar. It is not a marketplace and does not custody funds. Lenders keep their license, KYC, and collections. Saksi provides:

- a risk API with schema-validated AI output;
- deterministic policy enforcement;
- Soroban attestations for approvals and rejections;
- x402 risk reports settled in USDC on Stellar;
- an MCP server for agent access.

## Boundaries

| Component | Owns | Does not own |
|---|---|---|
| Lender | license, KYC, funds, collections | underwriting policy engine |
| Saksi API | scoring, policy, attestation, audit | custody, lending, fiat rails |
| Soroban | policy registry, decision anchors, optional funding hooks | personal data, documents |
| x402 facilitator | paid risk reports | credit decisions |
| MCP server | tool access for agents | signing or custody |

## Data flow

1. Lender submits an invoice reference and debtor data to the API.
2. Risk engine produces a scored decision with rationale.
3. Policy engine evaluates caps and returns approve/reject.
4. API computes a canonical decision memo and its hash.
5. Soroban anchors the hash and the verdict.
6. Lender funds or rejects; the UI shows the receipt.
7. x402 clients can buy the risk report with USDC on Stellar.
8. MCP tools expose the same pipeline to agents.

## Trust model

- The AI is advisory. The policy engine is authoritative.
- The chain enforces caps; a compromised agent key cannot exceed them.
- Every decision, including rejection, is attestable.
- Receipts are verifiable against the contract and the API memo.
- No secret or personal data is written on-chain.

## Stack

- Web: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui
- API: Fastify, zod, Drizzle, PostgreSQL, Redis
- Contracts: Rust, soroban-sdk
- Risk: TypeScript/Python, schema-validated LLM
- x402: HTTP 402 + USDC verification on Stellar
- MCP: @modelcontextprotocol/sdk

## Non-goals for the first award

- Custody of funds.
- Lending license.
- Mainnet without audit.
- Consumer crypto payments in Indonesia.
- Copying Faktura or any existing project.
