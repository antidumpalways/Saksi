# Validation Protocol

## Purpose

Force independent, meticulous review of every artifact and prevent a single agent from declaring success alone. The protocol is designed for code, contracts, product claims, and SCF submission material.

## Roles

| Role | Mode | Can edit? | Job |
|---|---|---|---|
| orchestrator | primary | yes | plan, delegate, enforce gates, final sign-off |
| builder | subagent | yes | implement one scoped change with evidence |
| contracts-reviewer | subagent | no | Soroban correctness, tests, invariants |
| stellar-integration-reviewer | subagent | no | Stellar stack, SEPs, USDC, x402, MCP |
| security-auditor | subagent | no | threat model, policy bypass, key handling, abuse |
| frontend-reviewer | subagent | no | UX, accessibility, originality, no cloning |
| qa-validator | subagent | no | reproduce, run tests, verify evidence |
| scf-reviewer | subagent | no | eligibility, originality, claim accuracy, SCF fit |
| arbiter | subagent | no | resolve disagreements and issue final verdict |

## Loop

1. **Scope** — Orchestrator writes the change scope, acceptance criteria, and risk level.
2. **Build** — Builder implements and records evidence. Builder may not approve.
3. **Independent review** — At least two reviewers inspect the artifact without seeing each other's verdicts first.
4. **Cross-check** — Reviewers exchange verdicts. Any disagreement is logged with file/line or command evidence.
5. **Arbitration** — Arbiter reads both verdicts and the evidence, then issues PASS, FAIL, or ESCALATE.
6. **Repair** — Builder fixes FAIL items. A new review cycle starts. Maximum 3 cycles before human escalation.
7. **Sign-off** — Orchestrator signs off only when every gate is PASS and the evidence index is complete.

## Rules

- Reviewers must inspect the artifact, not the builder's summary.
- A verdict without evidence is invalid.
- Severity: BLOCKER, HIGH, MEDIUM, LOW.
- BLOCKER or HIGH blocks sign-off.
- MEDIUM requires a written mitigation or explicit acceptance by the orchestrator.
- LOW may be deferred with a tracked issue.
- No reviewer may approve work they authored.
- No agent may claim "done" based on intent. Only verified behavior counts.
- If two reviewers disagree, the arbiter decides. If the arbiter cannot decide, escalate to the human.
- Every cycle appends to `docs/agents/validation-log.md`.

## Output format for reviewers

```
VERDICT: PASS | FAIL | ESCALATE
SCOPE: <artifact and files reviewed>
EVIDENCE: <commands, paths, tx hashes, URLs>
FINDINGS:
- [SEVERITY] file:line — issue — required fix
CHECKS:
- [x] check name
- [ ] check name
NOTES: <risks, assumptions, follow-ups>
```

## Anti-rubber-stamp checks

The orchestrator must reject a review if:
- it contains no file paths or command output;
- it repeats the builder's wording without independent inspection;
- it marks all checks passed while a known blocker exists;
- it reviews only the summary, not the diff.

## Human escalation triggers

- 3 failed cycles on the same gate.
- A BLOCKER that cannot be fixed without changing product scope.
- A legal, licensing, or eligibility question.
- A claim that cannot be evidenced.
