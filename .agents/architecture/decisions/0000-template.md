# ADR-0000: <Title in imperative form, e.g. "Use Postgres over DynamoDB">

- **Status**: Proposed | Accepted | Superseded by [ADR-NNNN](./NNNN-...md) | Deprecated
- **Date**: YYYY-MM-DD
- **Owner**: <person or team>
- **Deciders**: <names>

## Context

What forced the decision? Constraints, prior state, scale assumptions, deadlines, regulatory or team-shape factors. Two short paragraphs max. No history — keep it about the decision point.

## Decision

One sentence stating the choice, then 2–4 sentences on the rationale. Be specific: name versions, regions, vendors, thresholds.

## Alternatives considered

- **<Option A>** — why it lost. One line each, not a feature comparison matrix.
- **<Option B>** — why it lost.
- **<Status quo>** — why doing nothing was rejected.

## Consequences

**Positive**
- What this unlocks.

**Negative**
- What this forecloses or makes harder. Be honest — every decision has a cost.

**Follow-up**
- What must be true within N weeks for this to land cleanly (migrations, deprecations, runbook updates).

## Revisit when

A trigger that should force a re-evaluation. E.g. *"if write throughput exceeds 5k/s sustained"* or *"if the team passes 30 engineers"*. Without a trigger, ADRs ossify.
