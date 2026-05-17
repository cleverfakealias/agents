---
description: TypeScript style and safety rules for application and library code.
applyTo: '**/*.{ts,tsx}'
---

# TypeScript

- Use `interface` for object shapes, `type` for unions / intersections / mapped types.
- `unknown` over `any`. Narrow with `instanceof`, `in`, or a type guard. A cast (`as X`) requires an inline comment justifying the cast.
- Named exports only. No `export default`.
- `const` over `let`. Never `var`.
- Async: `async/await`. Never leave a floating promise. `Promise.all` for independent work; never sequential awaits in a `for` loop where parallel is correct.
- Errors: narrow with `instanceof Error` (or your typed error class). `catch (e) { /* swallow */ }` is banned. Re-throw at the call boundary.
- Modules: `import` order — external, then internal alias (`@/...`), then relative, then types.

## React (when files match `**/*.tsx`)

- Function components. Hooks at the top, in declaration order.
- Props as a typed `interface` named `<Component>Props`. No `React.FC` shorthand.
- Server Components by default in App Router. Add `"use client"` only when interactive.
- Hooks rules: no conditional hooks, no hooks in callbacks. Custom hooks are functions named `use*`.

## Performance

- Memoize only when measured. Default `useMemo`/`useCallback` are anti-patterns.
- `for...of` over `.forEach` on hot paths (better with async).

## Common mistakes to avoid

- Don't widen a type to `any` to silence an error. Diagnose the real issue.
- Don't drop `await` from an async call to silence a type warning.
- Don't use `@ts-ignore` without an inline comment naming the underlying issue and a follow-up plan.
