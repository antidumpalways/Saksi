---
description: Run the full Saksi validation loop for the current change or scope.
agent: orchestrator
---

Run the full validation loop for: $ARGUMENTS

Steps:
1. Read `AGENTS.md`, `docs/agents/validation-protocol.md`, and `docs/agents/quality-gates.md`.
2. Define the scope, acceptance criteria, and risk level.
3. Delegate implementation to `builder` if code changes are needed.
4. Run independent reviews with `contracts-reviewer`, `security-auditor`, `stellar-integration-reviewer`, `frontend-reviewer`, `qa-validator`, and `scf-reviewer` as applicable.
5. Require evidence for every verdict.
6. If reviewers disagree, delegate to `arbiter`; if unresolved, escalate to the human.
7. Append the cycle to `docs/agents/validation-log.md`.
8. Do not sign off unless every applicable gate is PASS.

Return the final report using the orchestrator format.
