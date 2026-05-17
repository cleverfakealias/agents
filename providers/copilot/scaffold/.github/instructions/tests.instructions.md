---
description: Test conventions across languages.
applyTo: '**/*.{test,spec}.{ts,tsx,js,jsx,py}'
---

# Tests

## Naming

- Names are sentences: `"returns null when user not found"`, `"throws ValidationError on empty payload"`.
- Group with `describe` (TS) or class scope (Py) for the unit under test.
- One logical assertion per test. Multiple `expect` calls are fine when they assert facets of the same fact.

## What to test

- **Behavior, not implementation.** Refactoring should not break a test that's still describing valid behavior.
- **Critical paths** — auth, payments, data integrity. Cover happy path + at least one failure.
- **Edge cases** — null, empty, max, concurrent, boundary values.

## What NOT to test

- Generated code.
- Third-party library internals.
- Trivial getters/setters with no logic.

## Mocking

- Mock what you don't own: network, filesystem, time, third-party APIs.
- Never mock what you own — refactor for testability instead.
- Prefer fakes (in-memory implementations) over mocks where the contract is non-trivial.

## Snapshots

- Use sparingly. Snapshot tests rot — they pass on accidental drift if humans don't review them.
- Snapshot output that's stable AND human-readable, never blob JSON.

## Test data

- Use builders / factories — avoid 30-line literal objects in every test.
- Keep test data minimal: include only the fields the test actually asserts on.
