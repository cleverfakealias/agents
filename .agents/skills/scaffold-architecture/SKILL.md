---
name: scaffold-architecture
description: "Populate or audit the .agents/architecture/ Mermaid diagrams (system, dataflow, deployment) from codebase signals. Triggers: 'scaffold architecture diagrams', 'fill in system.mmd', 'generate architecture mermaid', 'audit architecture drift', 'is the system diagram stale', 'detect services for architecture', 'update deployment topology'."
---

# scaffold-architecture — Populate & Audit Architecture Diagrams

Walk the codebase, detect the load-bearing services / datastores / external APIs / deployment topology, and write meaningful Mermaid into `.agents/architecture/{system,dataflow,deployment}.mmd`. Three modes: **Auto** (detect and write), **Guided** (layered interview, write after each layer confirms), **Audit** (drift report, never writes).

> **BEFORE EXECUTING:** Read [`SKILL-implementation.md`](SKILL-implementation.md) (sibling file) for the full step-by-step logic — detection sources by confidence tier, layered-interview script, drift-classification rules, frontmatter stamping, and error handling. This page is orientation only; the implementation doc is the contract.

---

## When to Use

| Situation | Mode |
|---|---|
| You opted into the architecture layer at init but the diagrams are still templates | **Auto** or **Guided** |
| You trust the detection heuristics; want diagrams written in one pass | **Auto** |
| You want a layered interview, confirming each diagram before the next | **Guided** |
| You shipped infra changes and want to know if diagrams drifted | **Audit** |
| You added a new external dependency and want to verify coverage | **Audit** |

---

## Layer-Presence Guard

The skill refuses to run if `.agents/architecture/` does not exist. The architecture layer is opt-in at init — if it's not present, the user should re-run the init skill and select the layer first.

---

## Mode 1: Auto

Detect components from declarative sources (config files, IaC) first, code references second; write all three `.mmd` files in one pass.

- Reads in this priority order: IaC (`terraform/`, `pulumi/`, `wrangler.toml`, `fly.toml`, `render.yaml`, `docker-compose.yml`, Kubernetes manifests) → manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`, `*.csproj`, `mix.exs`, `Gemfile`) → code (env var references, route handlers, framework hints).
- Polyglot detection covers **Node, TypeScript, Python, Java/Spring, .NET, Elixir, Go, Rust, Ruby** — the classification tables in the implementation doc map each ecosystem's deps to architecture roles.
- Tier-1, Tier-2, and Tier-3 detection run in parallel via three Haiku sub-agents; the main agent merges and dedupes the results.
- Tags every detected node with **confidence**: `(high)` for IaC, `(medium)` for deps/manifests, `(low)` for code-inferred.
- Leaves `<!-- TODO: confirm with team -->` markers next to `(low)` nodes — never invents components.
- Caps at **30 nodes per diagram** (matches `.agents/architecture/README.md` invariant). If detection exceeds, asks the user to split or narrow scope before writing.
- Stamps YAML frontmatter — `verified-against`, `verified-at`, `generated-by: scaffold-architecture (auto)` — on every file written.
- For `dataflow.mmd`, the hardest to auto-infer: picks the auth'd-read path if a router and a DB are detected; otherwise leaves a generic template seeded with detected node names and a `<!-- TODO: pick a canonical flow -->` header.

**When to pick it:** You want fast iteration and trust yourself to review the diagram for `(low)` markers and TODOs.

---

## Mode 2: Guided

Same detection as Auto, but presents one diagram at a time as a draft for confirmation before writing.

- **Layer 1 — System diagram**: Show detected components (external / app / state subgraphs) and edges. Ask: `Write as proposed` / `Let me edit it` / `Skip system.mmd`.
- **Layer 2 — Dataflow diagram**: Show detected canonical request path. Ask: which path is canonical for *this* system (auth'd read, primary write, hot async)? Then show the draft sequence and confirm.
- **Layer 3 — Deployment diagram**: Show detected runtime topology from IaC. Confirm regions, compute primitives, and state primary location.
- Same frontmatter stamping; `generated-by: scaffold-architecture (guided)`.
- Same 30-node cap per diagram.

**When to pick it:** First time scaffolding, or the codebase has unusual conventions the heuristics will miss (e.g. a custom internal SDK that the agent won't recognize as an "external" boundary).

---

## Mode 3: Audit

Read existing `.mmd` files, compare to detected codebase state, produce a drift report. **Never writes.**

- Reads YAML frontmatter from each `.mmd` (verifies `verified-against` SHA).
- Freshness is git-based: uses `git log <verified-against>..HEAD` to count commits since the stamp; no reliance on file mtime (mtime resets on `git clone`).
- Compares to current detection:
  - **System drift** — top-level deps in manifests without a node; nodes on the diagram referencing deps that no longer exist; new env vars like `*_API_KEY` / `*_URL` implying an external API not represented.
  - **Dataflow drift** — new middleware in the framework's request pipeline; cache or queue clients added/removed; auth middleware changes.
  - **Deployment drift** — IaC additions (new region, new compute primitive, new datastore) not on the diagram; removed infra still shown.
- Classifies each file:
  - **Fresh** — 0 commits since `verified-against` to architecture-relevant files; no uncovered surface detected
  - **Lightly drifted** — 1–10 commits OR 1–3 uncovered surfaces
  - **Stale** — >10 commits OR >3 uncovered surfaces OR any node references a file/dep that no longer exists
- Produces an **uncovered surface list** per diagram.
- Ends with `AskUserQuestion`: "Re-run in Auto or Guided mode for the stale diagrams?"

**When to pick it:** After a sprint that touched infra; before a handoff; on a cadence (e.g. monthly) to keep diagrams honest.

---

## What Gets Created / Updated

### Auto and Guided modes
- `.agents/architecture/system.mmd` — populated with detected components + confidence tags
- `.agents/architecture/dataflow.mmd` — populated canonical-path sequence
- `.agents/architecture/deployment.mmd` — populated runtime topology from IaC
- Each file stamped with YAML frontmatter

### Audit mode
- **Nothing written.** Output only: drift report + uncovered surface list + proposed next actions.

### Never touched by this skill
- `.agents/architecture/decisions/` — ADRs are managed by `scaffold-adr`, not this skill.
- `.agents/architecture/*.template.mmd` — templates are managed by `tidy-scaffold` for removal, not by this skill.
- `.agents/architecture/README.md` — human documentation, hand-maintained.
- Anything outside `.agents/architecture/`.

---

## Self-Management Contract

- **Reads `project_context.md` and `llms.txt` before every run** — uses `do-not-touch` and detected stack to scope.
- **Refuses to run if `.agents/architecture/` is absent** — directs user to re-run init with architecture layer enabled.
- **Stamps every generated file** with `verified-against` (current git short SHA), `verified-at` (today), and `generated-by`.
- **Caps at 30 nodes per diagram** — asks the user to narrow scope before exceeding.
- **Tags low-confidence nodes** with `(low)` and `<!-- TODO: confirm -->` rather than inventing entities.
- **Never overwrites a hand-edited `.mmd` file** silently — checks `git diff --quiet HEAD --` before write; if modified, asks for explicit confirm in Guided, or demotes to report-only in Auto (lists the file as "skipped — locally modified" rather than overwriting).
- **Never auto-writes in Audit mode** — output is a report.
- **Never reads secret files** — `.env`, `*.pem`, `*.key`, etc. (Hard Exclusions in implementation doc.)

---

## Implementation

All execution logic — detection sources by tier, exact AskUserQuestion payloads, layered-interview script, drift-classification rules, frontmatter stamping, and error handling — lives in **[`SKILL-implementation.md`](SKILL-implementation.md)**. Read it before executing.
