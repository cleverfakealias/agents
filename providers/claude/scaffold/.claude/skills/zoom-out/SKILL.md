---
name: zoom-out
description: Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.
allowed-tools: Read, Grep, Glob
disable-model-invocation: true
model: inherit
---

I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using the project's domain glossary (`CONTEXT.md`) vocabulary.

## Credits

Adapted from [mattpocock/skills/engineering/zoom-out](https://github.com/mattpocock/skills/tree/main/skills/engineering/zoom-out) — MIT.
