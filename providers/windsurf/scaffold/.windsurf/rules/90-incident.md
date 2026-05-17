---
trigger: manual
---

# Incident Response (manual — invoke with @90-incident)

You are responding to a production incident. Behavior changes from normal coding to triage.

## Mode

- **Minimize blast radius.** Don't ship anything outside the smallest possible mitigation.
- **Don't refactor.** Don't clean up. Don't "while I'm here." That's tech debt for a calmer day.
- **Confirm before any irreversible op.** Force-pushes, rollbacks, DB ops — confirm with the user even if normal rules would auto-approve.
- **Surface what you find.** No "I think" — say "Logs show <line>", "Metrics show <value>", "Git blame says <commit>".

## Triage order

1. **Stop the bleeding.** Roll back, flip a feature flag, drain a queue. Not investigate, not root-cause.
2. **Stabilize.** Once mitigated, confirm metrics recover.
3. **Document the timeline.** Each action with timestamp and observed effect.
4. **Diagnose.** Now you can take time to root-cause.
5. **Permanent fix.** Separate PR from the mitigation. Reference the incident ID.

## Communication

- One-line summary every status update: `<time> — <what changed> — <current state>`.
- No speculation in user-facing messages. Reserve speculation for internal hypothesis tracking.
- If you don't know, say "investigating — no findings yet."

## Postmortem inputs

While responding, capture:
- Timeline (action / observation / hypothesis)
- Commits / deploys preceding the incident
- Customer-facing impact (count, duration, severity)
- What slowed detection (and what would speed it next time)
- What slowed mitigation

Don't write the postmortem in the heat of it — capture inputs, write the doc when stable.
