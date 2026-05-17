---
description: 'Scaffold a new React component with test + Storybook story. Use when user says "new component" / "scaffold a component" / "create a <Name> component" / "add a UI component", and the project uses React.'
agent: 'agent'
model: 'Claude Sonnet 4.6'
tools: ['search/codebase', 'edit/applyPatch']
argument-hint: 'ComponentName'
---

Create a new React component named **${input:name:ComponentName}** in `packages/ui/src/components/${input:name}/`.

Generate four files:

1. `${input:name}.tsx` — function component, named export, typed props interface `${input:name}Props`. Use Server Components conventions if the surrounding code does; add `"use client"` only when the component needs interactivity.
2. `${input:name}.test.tsx` — Vitest + React Testing Library. At least one rendering test and one interaction test.
3. `${input:name}.stories.tsx` — CSF3 default export + one variant story.
4. `index.ts` — re-export the component.

Follow rules in `.github/instructions/typescript.instructions.md` and `.github/instructions/tests.instructions.md`.

If the user has text selected, treat it as the design or behavior spec:

```
${selection}
```

Stop before importing the component into a parent route — that's a separate task.
