---
max_turns: 30
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill, Agent]
---

/factory:spec Add a `/health` endpoint to the web server that returns JSON
`{"status":"ok","version":"<package version>"}` with HTTP 200, and HTTP 503
with `{"status":"degraded"}` when the database ping fails.

Answers to anything you would ask: it is public, no auth; the database ping
has a 500 ms timeout; it ships with the next normal deploy; there are no
other non-goals. Decide anything else yourself and log it. Do not ask me
questions in this run.
