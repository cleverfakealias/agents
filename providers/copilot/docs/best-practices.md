# GitHub Copilot — Best Practices (2026)

Distilled from docs.github.com/en/copilot and code.visualstudio.com/docs/copilot.

## File precedence

When Copilot assembles context for a Chat / agent / coding-agent request, it concatenates (in this order):

1. **Personal custom instructions** (user-level, set in GitHub settings)
2. **Repository custom instructions** (`.github/copilot-instructions.md`) — auto-injected
3. **Path-matched `.instructions.md` files** — `applyTo` glob hits the file in scope
4. **`AGENTS.md`** (root + nested, when `chat.useAgentsMdFile` and `chat.useNestedAgentsMdFiles` are on)
5. **Settings-based instructions** (`reviewSelection`, `commitMessageGeneration`, `pullRequestDescriptionGeneration`) — additive, **not** a precedence override
6. **The prompt itself** (`.prompt.md` body, if a prompt was invoked)
7. **User's chat message**

**Conflict resolution:** earlier wins. Personal > repository. File-based > settings-based.

## `copilot-instructions.md` — what goes in

| Include | Skip |
|---|---|
| Repo summary (1 paragraph) | Marketing copy |
| Build / test / lint / validate commands | Language docs |
| Project layout (key dirs) | File-by-file descriptions |
| CI/CD overview | History essays |
| Coding conventions (terse bullets) | "Be careful" / "write clean code" |
| Boundaries (do not touch X) | Persona/tone directives — GitHub explicitly bans these |
| Env-var quirks | Response-length caps — explicitly banned |

**Size:** ≤2 pages of Markdown (~150 lines, ~10KB). Beyond that, retrieval degrades.

## Path-scoped `.instructions.md`

```yaml
---
description: 'TypeScript style and safety rules'
applyTo: '**/*.{ts,tsx}'
excludeAgent: ['copilot-code-review']   # optional, since 2025-11-12
---
- Use `interface` for object shapes, `type` for unions/intersections.
- No `any`; prefer `unknown` + narrowing.
- Named exports only.
- Async with `async/await`; never floating promises.
```

`applyTo` glob syntax: `**`, `*`, `{a,b}`. Omit → opt-in only (must be `#`-referenced in chat).

## `.prompt.md` (parameterized prompts)

```yaml
---
description: 'Scaffold a new React component with test + story'
agent: 'agent'                        # ask | agent | plan | <custom-agent>
model: 'Claude Sonnet 4.6'
tools: ['search/codebase', 'edit/applyPatch']
argument-hint: 'ComponentName'
---
Create a component named ${input:name:ComponentName} in
packages/ui/src/components/${input:name}/...
```

**Variables:** `${input:name}`, `${input:name:placeholder}`, `${selection}`, `${file}`, `${workspaceFolder}`.
**Invoke:** `/<promptname>` in Chat, or Command Palette > "Chat: Run Prompt".

## `.agent.md` (custom agents, formerly chatmodes)

```yaml
---
description: Planning-only agent — produces an implementation plan, no edits.
name: Planner
tools: ['search/codebase', 'search/usages', 'web/fetch']
model: ['Claude Opus 4.5', 'GPT-5.2']
handoffs:
  - label: Implement Plan
    agent: agent
    prompt: Implement the plan outlined above.
---
You are a senior architect. Produce an implementation plan...
```

| Use prompts for | Use agents for |
|---|---|
| One-shot template ("generate X") | Persistent persona for a whole conversation |
| Filled with variables and selection | Locked-down tools/model |
| Run from a button or `/` | Switched via the agent picker |

## MCP — `.vscode/mcp.json`

```json
{
  "inputs": [
    { "type": "promptString", "id": "gh-pat", "description": "GitHub PAT", "password": true }
  ],
  "servers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${input:gh-pat}" },
      "envFile": "${workspaceFolder}/.env",
      "sandboxEnabled": true
    },
    "remote-api": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${input:api-token}" }
    }
  }
}
```

Root key is `servers`, not `mcpServers` (this differs from Claude / Cursor / Gemini). `sandboxEnabled` on stdio servers restricts FS/network — leave it on.

## Cloud coding agent — `.github/workflows/copilot-setup-steps.yml`

Job name **must** be `copilot-setup-steps`. Only honored: `steps`, `permissions`, `runs-on`, `services`, `snapshot`, `timeout-minutes` (≤59). Ubuntu x64 / Windows 64 only.

```yaml
name: "Copilot Setup Steps"
on:
  workflow_dispatch:
  push:
    paths: [.github/workflows/copilot-setup-steps.yml]
jobs:
  copilot-setup-steps:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
```

**Secrets:** put in the **Agents** environment in repo settings (separate from regular Actions secrets).
**Proxy:** `https_proxy`, `http_proxy`, `no_proxy`, `ssl_cert_file`, `node_extra_ca_certs`.

## VS Code settings that matter (2026)

Active:
- `github.copilot.chat.reviewSelection.instructions`
- `github.copilot.chat.commitMessageGeneration.instructions`
- `github.copilot.chat.pullRequestDescriptionGeneration.instructions`
- `chat.instructionsFilesLocations`, `chat.useCustomizationsInParentRepositories`
- `chat.useAgentsMdFile`, `chat.useNestedAgentsMdFiles`, `chat.useClaudeMdFile`
- `chat.includeApplyingInstructions`, `chat.includeReferencedInstructions`
- `github.copilot.chat.organizationInstructions.enabled`

Deprecated (VS Code 1.102+):
- `github.copilot.chat.codeGeneration.instructions`
- `github.copilot.chat.testGeneration.instructions`

## Sources

- [Adding repository custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Response customization (anti-patterns)](https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/prompting/response-customization)
- [Custom instructions in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Custom chat modes / agents](https://code.visualstudio.com/docs/copilot/customization/custom-chat-modes)
- [MCP configuration](https://code.visualstudio.com/docs/copilot/reference/mcp-configuration)
- [Coding agent environment setup](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
- [AGENTS.md changelog 2025-08-28](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/)
- [Code review + agent-specific instructions changelog 2025-11-12](https://github.blog/changelog/2025-11-12-copilot-code-review-and-coding-agent-now-support-agent-specific-instructions/)
