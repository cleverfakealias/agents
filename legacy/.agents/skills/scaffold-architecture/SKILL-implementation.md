# scaffold-architecture — SKILL Implementation

**Detailed execution contract. Read this before running the skill.**

---

## Hard Exclusions (apply to every step)

Never read or pass to a subagent: `.env`, `.env.*`, `.envrc`, `.dev.vars*`, `secrets.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `.npmrc`, `.pypirc`, `~/.aws/credentials`, `~/.config/gcloud/`, `gha-creds-*.json`, `.terraformrc`. Variable **names** may be inferred from non-secret sources (`process.env.X` in code, schema files, `wrangler.toml` `[vars]` keys) — values never.

Never modify:
- `.agents/architecture/decisions/` (ADR domain — `scaffold-adr` owns this)
- `.agents/architecture/*.template.mmd` (template domain — `tidy-scaffold` owns removal)
- `.agents/architecture/README.md` (human-maintained)
- Anything outside `.agents/architecture/`

---

## Entry Point

When invoked, run **Phase 0** immediately. Do not ask for a mode until orientation is complete — the orientation determines whether the skill can even run.

---

## Phase 0: Orientation

### 0A. Layer-Presence Guard

Check that `.agents/architecture/` exists. If not:

```
.agents/architecture/ is not present in this repo. The architecture layer
is opt-in at init time.

Run the init skill (.agents/SKILL.md), select "Architecture" in the optional
context layers question, then re-run scaffold-architecture.
```

Stop. Do not proceed.

### 0B. Read Project Context

Read in order:

1. `.agents/project_context.md` — detect stack, framework, runtime; surfaces hints for component naming.
2. `llms.txt` (repo root) — extract `do-not-touch:` line; confirm `architecture-*` pointer lines are uncommented (sanity check the layer was actually enabled).
3. `.agents/architecture/README.md` — confirms the 30-node-per-diagram cap and the file naming convention.

If `project_context.md` is absent: stop. Tell the user to run init first.

### 0C. Capture Current Commit SHA

Run: `git rev-parse --short HEAD`

Store as `<current-sha>`. Stamped into every generated file's frontmatter; used as the freshness baseline in Audit mode.

If git history is unavailable, proceed but skip churn-based audit signals. Note the limitation in the final report.

### 0D. Mode Selection

Use `AskUserQuestion`:

```
Question: "What would you like to do?"
Header: "scaffold-architecture — Mode"
Options:
  1. "Auto — detect from codebase and write all three diagrams"
     Description: "Read IaC, manifests, and code; populate system.mmd / dataflow.mmd / deployment.mmd with detected components in one pass. Confidence-tagged."
  2. "Guided — layered interview, confirm each diagram before writing"
     Description: "System first → confirm → dataflow → confirm → deployment. Same detection signals, but you approve each draft."
  3. "Audit — drift report only, no writes"
     Description: "Compare existing diagrams to current codebase. Flag uncovered surfaces and classify each as Fresh / Lightly drifted / Stale."
```

Route to **Phase 1** (Auto/Guided) or **Phase 2C** (Audit).

---

## Phase 1: Detection

Detection runs the same in Auto and Guided. The detection output is a structured component graph that both modes consume.

### 1A. Tier-1 Detection — IaC (confidence: high)

Look for and parse, if present:

| File / Dir | Extract |
|---|---|
| `wrangler.toml`, `wrangler.jsonc` | Worker name, `[[d1_databases]]`, `[[r2_buckets]]`, `[[kv_namespaces]]`, `[[queues]]`, `[[durable_objects]]`, `[vars]` keys (names only), `[[routes]]` |
| `fly.toml` | App name, `[mounts]`, `[[services]]`, primary region |
| `render.yaml` | Services, databases, env groups |
| `docker-compose.yml`, `docker-compose.yaml` | Services, images, volumes, depends_on edges |
| `terraform/*.tf`, `*.tf` | `aws_*`, `azurerm_*`, `google_*` resources, especially `*_db_instance`, `*_s3_bucket`, `*_lambda_function`, `*_apigateway_*`, `*_rds_*`, `*_dynamodb_*`, `*_sqs_*`, `*_sns_*` |
| `pulumi/*.ts`, `Pulumi.yaml` | Pulumi resource types |
| Kubernetes manifests (`*.yaml` with `kind: Deployment` / `Service` / `StatefulSet`) | Deployments, services, persistent volumes |
| `.github/workflows/*.yml` | Deploy targets (only as a hint for deployment.mmd) |
| `Dockerfile` (root or service dirs) | Image-based services (hint for system.mmd) |

Each extracted item becomes a node with `confidence: high`.

### 1B. Tier-2 Detection — Manifests (confidence: medium)

Read top-level deps:

| File | Extract |
|---|---|
| `package.json` | `dependencies` keys; classify common ones into roles (see classification table below) |
| `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py` | Same for Python |
| `Cargo.toml` | `[dependencies]` |
| `go.mod` | Direct requires |
| `Gemfile` | Gems |
| `composer.json` | `require` |
| `pom.xml`, `build.gradle` | Dependencies |

**Dependency classification table** (mapping common deps to architecture roles — extend as needed):

| Dep substring | Role | Adds to |
|---|---|---|
| `stripe`, `paddle`, `lemonsqueezy` | External payments API | system.mmd (External) |
| `@sendgrid/`, `resend`, `postmark`, `mailgun` | External email API | system.mmd (External) |
| `twilio` | External SMS/voice API | system.mmd (External) |
| `openai`, `anthropic`, `cohere`, `replicate` | External AI API | system.mmd (External) |
| `pg`, `postgres`, `mysql`, `mysql2`, `sqlite3`, `mongodb`, `mongoose`, `prisma`, `drizzle-orm`, `typeorm`, `sequelize`, `kysely` | Primary DB | system.mmd (State) |
| `redis`, `ioredis`, `@upstash/redis` | Cache | system.mmd (State) |
| `@aws-sdk/client-s3`, `boto3` (with s3), `@google-cloud/storage`, `cloudflare:r2` | Object store | system.mmd (State) |
| `bullmq`, `kue`, `agenda`, `celery`, `sidekiq`, `@cloudflare/workers-types` (queues) | Background queue | system.mmd (Application) |
| `next`, `nuxt`, `astro`, `remix`, `sveltekit`, `gatsby` | Web app framework | system.mmd (Application) |
| `express`, `fastify`, `koa`, `hono`, `fastapi`, `flask`, `django`, `rails`, `spring-boot-starter-web` | API framework | system.mmd (Application) |
| `socket.io`, `ws`, `@cloudflare/durable-objects` | Real-time / WebSocket | system.mmd (Application) |
| `pusher`, `ably`, `liveblocks` | External real-time service | system.mmd (External) |
| `sentry`, `datadog`, `newrelic`, `honeycomb` | Observability | deployment.mmd (Observability) |

If a dep doesn't match any row but looks load-bearing (e.g. it's in the top 5 by import count across the repo), include it with a question mark in the label and `confidence: medium`.

### 1C. Tier-3 Detection — Code References (confidence: low)

Scan source code for:

- **Env var names** (`process.env.X`, `os.environ.get('X')`, `Deno.env.get('X')`, `import.meta.env.X`, schema files like `env.ts` with `z.object({...})`):
  - `*_API_KEY`, `*_TOKEN`, `*_SECRET` → implies an external API (the prefix is usually the service name: `STRIPE_API_KEY` → Stripe)
  - `*_URL`, `*_HOST`, `*_ENDPOINT` → implies an external service or datastore at that URL
  - `DATABASE_URL`, `DB_HOST` → primary DB connection (confirm with manifest classification)
  - `REDIS_URL` → cache
- **Route handler files**: Next.js `app/**/route.{ts,js}`, `pages/api/**/*.{ts,js}`, Astro `pages/**.astro`, FastAPI `@app.{get,post,put,delete}`, Express/Hono `router.{get,post,...}`. Group by top-level path segment — that's the API surface entry list on system.mmd.
- **Auth middleware** signatures: usage of `next-auth`, `lucia`, `@auth/core`, `iron-session`, `passport`, Django's `LoginRequiredMixin`, FastAPI `Depends(get_current_user)`. Surfaces auth as a middleware node on dataflow.mmd.

Each Tier-3 hit becomes a node with `confidence: low` and gets a `<!-- TODO: confirm -->` marker in the generated Mermaid.

### 1D. Build the Component Graph

Merge Tier-1 / Tier-2 / Tier-3 results. **Dedupe** by canonical name (e.g. if `pg` is in `package.json` AND `DATABASE_URL` is in code AND a `terraform_aws_rds_instance` exists → one node, confidence = `high` (highest tier wins)).

Categorize each node into one of:
- `External` — third-party APIs and end users
- `Application` — services and processes the team owns
- `State` — datastores, caches, object stores, queues
- `Observability` — logs, metrics, traces (deployment.mmd only)

### 1E. Edge Inference

For `system.mmd`:
- User → primary web app (always present)
- Web app → API (if both detected and they're different services)
- API → each State node (default; users will trim in Guided mode)
- API → each External node (default)
- Background worker → State nodes it touches (inferred from imports if a worker is detected; otherwise assume DB + object store)

For `dataflow.mmd`:
- Default canonical path: `User → Web → API → Cache → DB`, with cache-miss branch.
- If auth middleware was detected: insert an `Auth` participant between Web and API.
- If a queue was detected and a write path is canonical: extend with `API → Queue → Worker → DB`.

For `deployment.mmd`:
- IaC region info → region subgraphs.
- Compute primitives (Workers, Lambdas, containers) → Compute subgraph.
- State primitives → State subgraph (with region annotations if present in IaC).
- Observability → dotted edges from compute to log drain / metrics.

### 1F. Cap Enforcement

For each diagram, if the proposed node count exceeds 30:

```
Question: "system.mmd would have <N> nodes (cap is 30 per .agents/architecture/README.md).
How should I scope it?"
Header: "Diagram Cap"
Options:
  1. "Keep top 30 by confidence × role-importance (External → Application → State → Observability)"
  2. "Split into system.mmd and system-<subdomain>.mmd (you'll name the split)"
  3. "Let me name the nodes to drop"
```

Apply the choice before proceeding to write or present.

---

## Phase 2A: Auto — Write All Three Diagrams

For each diagram (system → dataflow → deployment, in that order):

### Pre-Write Safety Check

Run `git diff --quiet HEAD -- .agents/architecture/<file>.mmd`. Non-zero exit (modified) means the file has local edits since HEAD.

- If the file is **template-equivalent** (byte-identical to its `.template.mmd` source after substituting `<dir>/` placeholders): proceed to overwrite. This is the expected case after init.
- If the file is **modified**: skip with a note in the final report (`Skipped <file>.mmd — locally modified since HEAD. Re-run in Guided mode to overwrite explicitly.`). Do not overwrite in Auto.

### Render Mermaid

Render the component graph into the appropriate Mermaid syntax:
- `system.mmd` → `flowchart LR` with `external` / `app` / `state` subgraphs
- `dataflow.mmd` → `sequenceDiagram` with `autonumber` and participants
- `deployment.mmd` → `flowchart TB` with region / compute / state / obs subgraphs

For each node with `confidence: low`, append ` %% (low)` and a `<!-- TODO: confirm with team -->` line in a header comment block listing all `(low)` nodes for that file.

### Frontmatter Stamping

Prepend to every generated file:

```yaml
---
verified-against: <current-sha from Phase 0C>
verified-at: <today's date as YYYY-MM-DD>
generated-by: scaffold-architecture (auto)
---
```

Mermaid renderers and llms-readers ignore YAML frontmatter at the top of `.mmd` files when followed by a `%%` Mermaid comment block — keep one blank line then start the diagram.

### Write

Write to `.agents/architecture/<file>.mmd`. Confirm inline:

```
✓ Wrote .agents/architecture/system.mmd  (<N> nodes, <K> low-confidence)
✓ Wrote .agents/architecture/dataflow.mmd
✓ Wrote .agents/architecture/deployment.mmd
```

---

## Phase 2B: Guided — Layered Interview

Run three sub-phases in order. Each writes one diagram and confirms before moving to the next.

### 2B-1. System Layer

Render the draft `system.mmd` and present inline:

```
Draft system.mmd:

  External: User, Stripe (medium), Postmark (low)
  Application: Astro web (high), Workers API (high), Queue worker (medium)
  State: D1 database (high), KV cache (high), R2 object store (high)

  Edges:
    User → Astro web
    Astro web → Workers API
    Workers API → D1
    Workers API → KV
    Workers API → Stripe
    Workers API → Postmark
    Workers API → Queue worker
    Queue worker → D1
    Queue worker → R2

  (full Mermaid below)
  ─────
  <rendered Mermaid>
```

Then `AskUserQuestion`:

```
Question: "Write system.mmd as proposed?"
Header: "Guided — System Layer"
Options:
  1. "Write as proposed"
     Description: "Stamp frontmatter and write the file as shown."
  2. "Let me edit it"
     Description: "I'll tell you what to add / remove / re-label; you'll revise and show me again."
  3. "Skip system.mmd"
     Description: "Don't write it; proceed to dataflow.mmd."
```

**If "Write as proposed":** Run the same pre-write safety check as 2A. Write. Confirm.

**If "Let me edit it":** Ask:

```
Question: "What should I change in system.mmd?"
Header: "Edit Draft — system.mmd"
Input: large text
Placeholder: "Remove the Queue worker — we use Workers Cron instead. Re-label 'Postmark' as 'Resend'. Add 'Cloudflare Images' under State."
```

Incorporate, re-present, then ask the simple write/edit/skip prompt again. Repeat until confirmed or skipped.

**If "Skip":** Note as skipped; move on.

### 2B-2. Dataflow Layer

Before drafting, ask which path is canonical:

```
Question: "Which request path should dataflow.mmd represent?"
Header: "Canonical Path"
Options:
  1. "Authenticated read (most common; cache + DB)"
  2. "Primary write (cache invalidation + DB write + queue dispatch)"
  3. "Hot async path (queue → worker → DB)"
  4. "Other — I'll describe it"
```

Build the draft using the chosen path. Present and confirm with the same write/edit/skip pattern as 2B-1.

### 2B-3. Deployment Layer

Render `deployment.mmd` from IaC (Tier-1 detection). Present and confirm with the same pattern.

---

## Phase 2C: Audit — Drift Report

### Read Existing Diagrams

For each of `system.mmd`, `dataflow.mmd`, `deployment.mmd`:

1. Read YAML frontmatter. Extract `verified-against`, `verified-at`, `generated-by`.
2. If frontmatter is absent: classify as `hand-written`. Skip freshness math; perform uncovered-surface check only.
3. Parse the Mermaid for node IDs and labels (regex-based for `flowchart`: `\b[A-Z_]+\b\[.*?\]` and `\b[A-Z_]+\b\(.*?\)`; for `sequenceDiagram`: `participant\s+\w+`).

### Compute Drift per File

For each file with frontmatter:

```
git log --oneline <verified-against>..HEAD -- <architecture-relevant paths>
```

Architecture-relevant paths to filter the log on:
- For `system.mmd`: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `composer.json`, `Gemfile`, `pom.xml`, `build.gradle`
- For `dataflow.mmd`: route handler dirs from project_context, middleware dirs, `src/auth/`, `src/middleware/`
- For `deployment.mmd`: `terraform/`, `wrangler.toml`, `fly.toml`, `render.yaml`, `docker-compose.yml`, `**/Dockerfile`, `.github/workflows/`, `k8s/`, `kubernetes/`

Classify:
- 0 commits AND 0 uncovered surfaces (next step) → **Fresh**
- 1–10 commits OR 1–3 uncovered surfaces → **Lightly drifted**
- >10 commits OR >3 uncovered surfaces OR a node references a removed dep/file → **Stale**

### Uncovered-Surface Check

Run Phase 1 (Detection) freshly against the current codebase. Compare to nodes present in each diagram:

- **Top-level deps** in current manifests not represented as a node in `system.mmd` → uncovered.
- **Env vars** matching `*_API_KEY` / `*_TOKEN` / `*_URL` patterns in current code, where the prefix doesn't appear in any `system.mmd` node label → uncovered (likely a new external API).
- **Route handler dirs** in current code with no representation in `dataflow.mmd` participants → uncovered.
- **IaC additions** since `verified-against` (`git diff <verified-against>..HEAD -- terraform/ wrangler.toml ...`) → uncovered for `deployment.mmd`.
- **Nodes in the diagram referencing deps not in current manifests** → removed-but-still-shown.

### Produce Audit Report

```
Audit Report — .agents/architecture/ — <today's date>

DIAGRAM STATUS
───────────────────────────────────────────────────────────────────────
  system.mmd        Lightly drifted    4 commits since abc1234
  dataflow.mmd      Fresh              0 commits since abc1234
  deployment.mmd    STALE              17 commits since abc1234 + 5 IaC additions

UNCOVERED SURFACES
──────────────────
  system.mmd:
    + dep "resend" in package.json — not on diagram (external email API)
    + env var "ANTHROPIC_API_KEY" in src/lib/ai.ts — not on diagram
    - node "Postmark" labels a dep that is no longer in package.json (removed)

  dataflow.mmd:
    + route group app/api/webhooks/ has no participant in the sequence

  deployment.mmd:
    + terraform/eu-west-1.tf added — new region not on diagram
    + Durable Object "RateLimiter" defined in wrangler.toml — not on diagram

NODES IN DIAGRAMS REFERENCING REMOVED COMPONENTS
─────────────────────────────────────────────────
  system.mmd: Postmark (dep removed from package.json)

Legend: + = new surface uncovered  - = node references removed component
        Fresh = 0 commits, no uncovered  Lightly drifted = 1–10 commits or 1–3 uncovered
        STALE = >10 commits, >3 uncovered, or removed-component reference
```

### Audit "What Next" Prompt

```
Question: "What would you like to do next?"
Header: "Audit — Next Action"
Options:
  1. "Re-run in Auto mode for the stale diagrams"
     Description: "I'll re-detect and overwrite the STALE files (only those not locally modified)."
  2. "Re-run in Guided mode for the stale diagrams"
     Description: "I'll show drafts for each stale diagram before overwriting."
  3. "Nothing for now — I'll handle it manually"
     Description: "Exit. The report above is the deliverable."
```

If option 1 or 2: re-run Phase 1, then Phase 2A/2B, scoped to only the STALE files. Skip Fresh and Lightly drifted unless the user explicitly requests them too (ask a follow-up if Lightly drifted exists).

---

## Phase 3: Final Report

After Auto or Guided mode completes:

```
scaffold-architecture — Done

Files written (N):
  • .agents/architecture/system.mmd       (<X> nodes, <Y> low-confidence)
  • .agents/architecture/dataflow.mmd
  • .agents/architecture/deployment.mmd

Skipped (M):
  • .agents/architecture/dataflow.mmd — locally modified  [Auto only]
  • .agents/architecture/system.mmd — user skipped  [Guided only]

verified-against: <current-sha>
verified-at: <today's date>

Low-confidence nodes to confirm (per diagram):
  system.mmd:
    - Resend (low) — inferred from env var RESEND_API_KEY; confirm this is the email provider
    - Queue worker (medium) — inferred from bullmq dep; confirm it's actually running in this stack

Next steps:
  • Render the diagrams locally to eyeball them (most markdown viewers handle Mermaid)
  • Resolve <!-- TODO: confirm --> markers
  • Commit: git add .agents/architecture/ && git commit -m "Scaffold architecture diagrams"
  • Run Audit mode after your next infra change to catch drift
```

---

## Error Handling

### No `.agents/architecture/` directory

Stop. Direct user to run init with architecture layer enabled. (See Phase 0A.)

### No `.agents/project_context.md`

Stop. Tell user to run init first.

### No git history

Skip churn-based audit signals. Use uncovered-surface detection only. Stamp frontmatter with `verified-against: unknown` and a note in the file: `# verified-against unavailable — git history missing at scaffold time`.

### Detection finds zero components

Common in greenfield repos. In Auto mode: do not overwrite the templates with empty diagrams. Tell the user:

```
I scanned the codebase but didn't detect enough load-bearing components to
populate the diagrams. This usually means the repo is greenfield or the
infra is described in a place I don't recognize.

Options:
  1. Re-run in Guided mode and tell me what's there
  2. Leave the templates in place and fill them in manually
  3. Tell me which file(s) describe your infra and I'll re-scan
```

Ask via `AskUserQuestion`. Do not write.

### A diagram exceeds 30 nodes

See Phase 1F. Ask the user to scope.

### A `.mmd` file is locally modified

- Auto mode: skip the file, list in final report.
- Guided mode: warn the user inline before the write/edit/skip prompt:
  ```
  ⚠ <file>.mmd has been modified since HEAD. Writing now would overwrite
  your local edits. Choose carefully.
  ```

### User aborts mid-Guided session

Files written before abort are real. Files not yet confirmed are not written. Report what landed and what didn't. Exit cleanly.

### Audit finds no nested AGENTS.md frontmatter (file existed pre-skill)

Treat as `hand-written`. Skip freshness math. Still run uncovered-surface check. Note in report: `(hand-written — freshness not computed)`.

---

## Scope Boundaries — What scaffold-architecture Never Does

- Never modifies `.agents/architecture/decisions/` — that's `scaffold-adr`'s domain.
- Never modifies `.agents/architecture/*.template.mmd` — those are templates; `tidy-scaffold` handles removal.
- Never modifies `.agents/architecture/README.md` — human documentation.
- Never modifies files outside `.agents/architecture/`.
- Never reads secret files (see Hard Exclusions).
- Never runs `git commit`, `git push`, or deploy commands.
- Never auto-writes in Audit mode.
- Never overwrites a hand-edited `.mmd` file in Auto mode — demotes to skip-and-report.
- Never invents components — uses `<!-- TODO: confirm -->` for `(low)` confidence inferences.
- Never exceeds 30 nodes per diagram without asking the user to scope first.
