// Run with: node --test "tests/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mods = fileURLToPath(new URL("../mods/", import.meta.url));
const names = readdirSync(mods, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith("."))
  .map((e) => e.name);
const hasClaude = spawnSync("claude", ["--version"], { shell: true }).status === 0;

test("every mod has a manifest and a hooks module that exists", () => {
  assert.ok(names.length > 0);
  for (const name of names) {
    const manifest = JSON.parse(readFileSync(join(mods, name, ".claude-plugin/plugin.json"), "utf8"));
    assert.equal(manifest.name, name, `${name}: plugin.json name matches its folder`);
    const hooks = JSON.parse(readFileSync(join(mods, name, "hooks/hooks.json"), "utf8"));
    for (const m of hooks.modules) assert.ok(existsSync(join(mods, name, "hooks", m)), `${name}: ${m} exists`);
  }
});

test("the shell tokenizer is the same file in every mod that holds it", () => {
  const copies = names
    .map((name) => join(mods, name, "hooks/shell.ts"))
    .filter((file) => existsSync(file))
    .map((file) => ({ file, text: readFileSync(file, "utf8").replace(/\r\n/g, "\n") }));
  assert.ok(copies.length >= 3, "package-gate, repo-lock and secret-shield each hold a copy");
  for (const { file, text } of copies) {
    assert.equal(text, copies[0].text, `${file} differs from ${copies[0].file}: copy the changed one over the others`);
  }
});

test("no hooks module names a local `h` or `next`: the engine refuses a shadowed JSX factory or continuation", () => {
  // The register module holds the hooks; a helper module (shell.ts) may use the names.
  for (const name of names) {
    const dir = join(mods, name, "hooks");
    for (const file of readdirSync(dir).filter((f) => /^register\.tsx?$/.test(f))) {
      const text = readFileSync(join(dir, file), "utf8");
      for (const bad of [/\b(?:const|let|var)\s+(?:h|next)\b/, /\bfunction\s+(?:h|next)\s*\(/, /\(\s*(?:h|next)\s*\)\s*=>/]) {
        const m = text.match(bad);
        assert.equal(m, null, `${name}/hooks/${file}: "${m?.[0]}" shadows a name the engine reserves`);
      }
    }
  }
});

for (const name of names) {
  test(`${name}: claude plugin validate and test pass`, { skip: !hasClaude && "claude CLI not on PATH" }, () => {
    for (const verb of ["validate", "test"]) {
      const r = spawnSync("claude", ["plugin", verb, join(mods, name)], { encoding: "utf8", shell: true });
      assert.equal(r.status, 0, `claude plugin ${verb} ${name}\n${r.stdout}${r.stderr}`);
    }
  });
}
