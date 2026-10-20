# Handoff Contract

Every handoff between agents must include all fields below. A handoff missing evidence is invalid and must be returned to the sender.

```
SCOPE:
- artifact:
- acceptance criteria:
- risk level: LOW | MEDIUM | HIGH

CHANGES:
- files:
- migrations:
- contracts:
- env vars:

COMMANDS:
- command:
- result:
- timestamp:

EVIDENCE:
- test output:
- tx hashes:
- URLs:
- screenshots:

REVIEWS:
- reviewer:
- verdict:
- findings:

UNVERIFIED:
- item:
- why:

RISKS:
- severity:
- mitigation:
- owner:

NEXT QUESTION:
- the single question the next reviewer must answer
```

## Rules

- The sender must not answer the next question on the reviewer's behalf.
- The reviewer must inspect the artifact, not the handoff summary.
- A verdict must cite evidence.
- Handoffs are append-only in `docs/agents/validation-log.md`.
