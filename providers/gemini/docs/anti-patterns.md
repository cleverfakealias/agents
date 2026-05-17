# Gemini CLI — Anti-Patterns

## `GEMINI.md` / `AGENTS.md` anti-patterns

- **Secrets in the context file.** Use `.gemini/.env` (gitignored) and reference env var **names** in the markdown.
- **Monolithic context.** Split with `@./...` imports. One massive file degrades retrieval and JIT loading benefits.
- **Skipping heading levels.** Gemini navigates by `#` → `##` → `###`. Flat or jagged hierarchies measurably hurt instruction following. Treat: H1 = scope, H2 = section, H3 = rule group.
- **Trying to override the system prompt.** `GEMINI.md` cannot countermand built-in behaviors (e.g., the "proactiveness" mandate). File an issue upstream instead of fighting it locally.
- **Forgetting `.geminiignore`.** It's separate from `.gitignore`. Without it, JIT loading pulls in nested `GEMINI.md` files from generated dirs.

## `.gemini/settings.json` anti-patterns

- **Flat schema.** The 2026 schema is nested (`tools.sandbox`, `security.toolSandboxing`, etc.). Flat keys still load for back-compat but are deprecated. Migrate.
- **`tools.sandbox` off + `--yolo`.** Autonomous + no sandbox = footgun. Pair them or use neither.
- **`trust: true` on third-party MCP servers.** Bypasses approvals — only ever for servers you wrote.
- **`checkpointing.enabled` off.** Breaks `/restore`. Turn it on; it's cheap.
- **`telemetry.enabled` and `usageStatisticsEnabled` left at default in proprietary repos** — opt out explicitly if your org policy requires it.

## TOML command anti-patterns

- **Treating the `prompt` field as YAML/Markdown frontmatter.** Gemini uses TOML, full stop. Triple-quoted `prompt = """..."""` is the body; `description` is the only other required field.
- **Forgetting interpolation order.** `@{file}` runs before `!{cmd}` runs before `{{args}}`. If you put `{{args}}` inside `@{ }`, it won't expand.
- **`!{cmd}` without sanitizing `{{args}}`.** Gemini auto-escapes inside `!{...}`, but compound shell commands can still leak unintended quoting. Test with adversarial input.
- **Same command name in user and project scope.** Project wins silently; the user version is invisible. Pick one or namespace them differently.

## MCP anti-patterns

- **Combining stdio + http transports in the same server entry.** Pick `command` OR `url` OR `httpUrl`; the parser picks the first one and ignores the others.
- **Missing `timeout`.** Hanging MCP servers freeze the agent. Set `timeout` (ms) explicitly.
- **`includeTools` left blank when the server exposes 50+ tools.** Bloats the tool list. Filter to what you actually use.

## Combining flags

- **`--yolo` without a sandbox** outside ephemeral VMs. The whole point of YOLO is no approvals; pair with a container or you're running unsanctioned shell on your host.
- **`SANDBOX_MOUNTS` with `:rw` on your home directory.** Defeats the sandbox. Mount specific subdirs only.

## Header hierarchy

- **Single `#` followed immediately by `###`.** Gemini's heading-based retrieval treats this as a missing level. Insert the `##`.
- **All headings at the same level.** Defeats hierarchy entirely. Group rules under `##` sections.

## Sources

- [Phil Schmid Gemini CLI cheatsheet](https://www.philschmid.de/gemini-cli-cheatsheet)
- [Proactiveness considered harmful](https://medium.com/google-cloud/proactiveness-considered-harmful-a-guide-to-customise-the-gemini-cli-to-suit-your-coding-style-b23c9b605058)
- [Sandboxing](https://geminicli.com/docs/cli/sandbox/)
- [Custom commands](https://geminicli.com/docs/cli/custom-commands/)
