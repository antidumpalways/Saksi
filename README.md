# Saksi

Policy and attestation layer for RWA credit on Stellar.

Saksi helps invoice financiers and private-credit desks run AI-assisted underwriting without letting the model exceed hard risk limits. Deterministic policy is enforced off-chain and ready to anchor on Soroban. Lenders keep custody and licensing.

## Status

Pre-launch. This repository currently contains the project scaffolding and the agent validation protocol. Product code is added through the validation loop.

## Start here

- `AGENTS.md` — product invariants, stack, rules.
- `docs/agents/validation-protocol.md` — review loop and roles.
- `docs/agents/quality-gates.md` — gates required before sign-off.
- `docs/agents/handoff-contract.md` — required handoff fields.
- `docs/architecture/overview.md` — boundaries and data flow.

## Agents

Primary: `orchestrator`.
Subagents: `builder`, `contracts-reviewer`, `stellar-integration-reviewer`, `security-auditor`, `frontend-reviewer`, `qa-validator`, `scf-reviewer`, `arbiter`.

## Commands

- `/validate <scope>` — run the full validation loop.
- `/gate <scope>` — evaluate G1–G8 with evidence.
- `/handoff <scope>` — produce a handoff record.

## Rules

- Original work only. No copying from Faktura or any other project.
- No false traction claims.
- Evidence or it did not happen.
- No self-approval.
- Applicant must be 18+.

## License

Proprietary until a license is chosen. Do not copy third-party code or assets.
