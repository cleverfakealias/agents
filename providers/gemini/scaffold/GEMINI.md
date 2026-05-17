# Gemini Memory — Optional Companion to AGENTS.md
<!--
  This file is OPTIONAL. AGENTS.md (sibling) covers the cross-tool contract.
  Use GEMINI.md only for Gemini-specific instructions you don't want other tools
  to see.

  If you don't have Gemini-specific instructions, DELETE this file — duplicate
  content between AGENTS.md and GEMINI.md wastes context budget every turn.
-->

# Gemini-Specific Behavior

## Header hierarchy
Gemini navigates by `#` → `##` → `###`. When organizing context, prefer hierarchy over flat lists.

## Long-context discipline (1M+ tokens)
- Don't summarize files you haven't read. Cite specific files and line numbers from provided context.
- "What does this repo do?" → answer from actual files, not from inferences about the name or stack.
- Don't truncate output because it "seems long." Complete the response.

## Multimodal
- Image / diagram alongside a code request = spec. Build to match it; don't describe what you see.

## Output style
- Lead long responses (>200 words) with a `## Summary` (one sentence).
- Multi-file: `## File: path/to/file.ts` per file, code block beneath.
- All code blocks tagged with language. No untagged blocks.

## Sandbox
- `<rules id="agentic-safety">` from AGENTS.md applies in full.
- Prefer `--sandbox` for exploratory or destructive commands.
- Read `AGENTS.md` at repo root before taking multi-step action.

## Never
- Hallucinate import paths, package names, or APIs. If not in training or context, say so.
- Output JSON with trailing commas or comments — invalid.
- Silently downgrade types (e.g. `string | null` → `string`) to make code compile.
