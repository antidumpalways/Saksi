---
description: Check the Saksi quality gates and return PASS/FAIL per gate with evidence.
agent: orchestrator
---

Evaluate the quality gates for: $ARGUMENTS

For each gate G1–G8 in `docs/agents/quality-gates.md`:
- Inspect the artifact directly.
- Run the relevant command if possible.
- Cite evidence (file:line, command output, tx hash, URL).
- Return PASS, FAIL, or WAIVED (with reason).

If any gate is FAIL, list the required fix and the responsible agent. Do not claim completion.
