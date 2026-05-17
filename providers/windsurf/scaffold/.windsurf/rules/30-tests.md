---
trigger: glob
globs: **/*.{test,spec}.{ts,tsx,js,jsx,py}, **/test_*.py, **/*_test.py
---

# Tests (auto-attached for test files)

- Test behavior, not implementation. Refactoring should not break a test for unchanged behavior.
- One logical assertion per test. Multiple `expect`/`assert` are fine for facets of the same fact.
- Names are sentences: `"returns null when user not found"`, `test_throws_on_empty_payload`.
- Mock what you don't own (network, fs, time). Never mock what you own.
- Use fakes (in-memory implementations) over mocks for non-trivial contracts.

## What to test

- Critical paths (auth, payments, data integrity): happy path + at least one failure.
- Edge cases (null, empty, max, concurrent, boundary).

## What NOT to test

- Generated code.
- Third-party library internals.
- Trivial getters/setters.

## Snapshots

- Use sparingly — they rot. Only stable, human-readable output.
- Never blob JSON snapshots that humans won't review.

## Test data

- Builders / factories over 30-line literal objects.
- Include only the fields the test asserts on.
