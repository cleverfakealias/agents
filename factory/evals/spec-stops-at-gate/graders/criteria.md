---
type: llm
weight: 1
---

All of these hold:

1. A folder `specs/<slug>/` exists with `requirements.md`, `plan.md`,
   `tasks.md` and `status.md`.
2. `requirements.md` has numbered acceptance criteria (AC-1, AC-2, ...) in
   EARS form ("WHEN ... THE SYSTEM SHALL ..." or "IF ... THEN THE SYSTEM
   SHALL ..."), covering the 200 response, the 503 response, and the 500 ms
   timeout.
3. `plan.md` has a test strategy table that maps every AC to a test or a
   named manual step.
4. The first task in `tasks.md` is writing the failing acceptance tests.
5. No implementation code or test file was written, and no branch was made.
6. The response ends by asking the user to approve the spec. `status.md`
   does not say `stage: approved`.
