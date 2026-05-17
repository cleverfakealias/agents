---
trigger: glob
globs: **/*.{ts,tsx}
---

# TypeScript (auto-attached for .ts/.tsx)

- `interface` for object shapes, `type` for unions / intersections / mapped types.
- `unknown` over `any`. Narrow with `instanceof`, `in`, or a type guard. Casts require an inline justifying comment.
- Named exports only. No `export default`.
- `const` over `let`. Never `var`.
- Async: `async/await`. Never floating promises. `Promise.all` for independent work — never sequential awaits in a loop where parallel is correct.
- Errors: narrow with `instanceof Error` (or your typed error class). `catch (e) {}` is banned. Re-throw at the call boundary.
- Imports: external, then internal alias (`@/...`), then relative, then types.

## React (when files match `**/*.tsx`)

- Function components. Hooks at the top in declaration order.
- Props as a typed `interface` named `<Component>Props`. No `React.FC`.
- Server Components by default in App Router. Add `"use client"` only when interactive.

## Suppress these tendencies

- Don't widen to `any` to silence a type error.
- Don't drop `await` from async calls.
- Don't replace existing libraries with "more popular" alternatives unless asked.
