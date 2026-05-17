Write tests for the symbol or file the user has open (or names in the prompt).

1. Read the source. Identify the public surface — exported functions, classes, hooks, components.
2. For each public symbol, write at minimum:
   - One happy-path test (the documented contract).
   - One edge case (null, empty, boundary, max).
   - One failure case (invalid input, missing dep).
3. Follow `.cursor/rules/30-tests.mdc` conventions: one logical assertion per test, names as sentences, mock only what we don't own.
4. Use the project's existing test framework (detect from `package.json` / `pyproject.toml` / `Cargo.toml`). Don't introduce a new one.
5. Place tests next to the source (`foo.test.ts` beside `foo.ts`) unless the project clearly uses `tests/` or `__tests__/`.
6. Run the new tests once and confirm they pass before reporting done.

If the source has side effects (network, filesystem, time), use the project's existing fakes / fixtures. If none exist, add a minimal in-memory fake — don't introduce a mocking library by surprise.

Don't refactor the code under test — even if it begs to be split. File a separate observation for the user.
