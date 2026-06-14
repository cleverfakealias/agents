#!/usr/bin/env node
// SessionStart + Stop hook: keep git worktrees from piling up.
// Removes only worktrees that are SAFE to delete — clean tree (no uncommitted
// changes, no untracked files) AND whose HEAD is already preserved on another
// branch or remote — then prunes stale registrations and empty leftover dirs.
// Worktrees holding unsaved work are kept and reported, never deleted.
// This hook is housekeeping: it always exits 0 and never blocks the session.
//
// Escape hatches:
//   - CLAUDE_SKIP_WORKTREE_CLEANUP=1  disables this hook entirely
//   - CLAUDE_WORKTREE_DIR=<relpath>   override the managed dir (default .claude/worktrees)
import { existsSync, readdirSync, rmdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.CLAUDE_SKIP_WORKTREE_CLEANUP === "1") process.exit(0);

const isWin = process.platform === "win32";
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = (cmd) => spawnSync(cmd, { shell: true, encoding: "utf8", cwd: root });
const q = (s) =>
  isWin ? `"${String(s).replace(/"/g, '""')}"` : `'${String(s).replace(/'/g, `'\\''`)}'`;
const norm = (s) => String(s).replace(/\\/g, "/");

if (run(isWin ? "where git" : "command -v git").status !== 0) process.exit(0);
if (run("git rev-parse --is-inside-work-tree").status !== 0) process.exit(0);

const mainRoot = norm(run("git rev-parse --show-toplevel").stdout?.trim() || "");
if (!mainRoot) process.exit(0);

const managedRel = process.env.CLAUDE_WORKTREE_DIR || ".claude/worktrees";
const managedAbs = norm(join(mainRoot, managedRel));

// -- 1. drop stale administrative entries (dirs already gone) ------------------
run("git worktree prune");

// -- 2. walk live worktrees; only touch ones under the managed dir -------------
// `git worktree list --porcelain` emits blank-line-separated records:
//   worktree <path> / HEAD <sha> / branch <ref>  (branch absent when detached)
const removed = [];
const kept = [];
let report = "";
let wt = { path: "", head: "", branch: "" };

const flush = () => {
  const wtPath = wt.path;
  if (!wtPath) return;
  const wtNorm = norm(wtPath);
  // only manage worktrees living under the managed dir, never the main checkout
  if (!`${wtNorm}/`.startsWith(`${managedAbs}/`)) return;
  if (wtNorm === mainRoot) return;
  if (!existsSync(wtPath)) return;

  let safe = true;
  const reasons = [];

  // dirty = any uncommitted change OR any untracked file
  const dirty = (run(`git -C ${q(wtPath)} status --porcelain`).stdout || "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (dirty.length) {
    safe = false;
    reasons.push(`${dirty.length} uncommitted/untracked`);
  }

  // unpushed = HEAD not reachable from any OTHER local branch or any remote ref.
  if (wt.head) {
    const local = (run(`git branch --format=%(refname) --contains ${wt.head}`).stdout || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((r) => r !== wt.branch);
    const remote = (run(`git branch -r --contains ${wt.head}`).stdout || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (local.length + remote.length === 0) {
      safe = false;
      reasons.push(`unpushed commits on ${wt.branch || "detached HEAD"}`);
    }
  }

  if (safe) {
    if (run(`git worktree remove ${q(wtPath)}`).status === 0) removed.push(wtPath);
  } else {
    kept.push(wtPath);
    report += `  kept ${wtNorm.replace(`${mainRoot}/`, "")} — ${reasons.join(", ")}\n`;
  }
};

for (const line of (run("git worktree list --porcelain").stdout || "").split(/\r?\n/)) {
  if (line.startsWith("worktree ")) {
    flush();
    wt = { path: line.slice("worktree ".length), head: "", branch: "" };
  } else if (line.startsWith("HEAD ")) {
    wt.head = line.slice("HEAD ".length);
  } else if (line.startsWith("branch ")) {
    wt.branch = line.slice("branch ".length);
  } else if (line === "") {
    flush();
    wt = { path: "", head: "", branch: "" };
  }
}
flush();

// -- 3. prune again (for removals above) + delete empty orphan dirs ------------
run("git worktree prune");
if (existsSync(managedAbs)) {
  try {
    for (const entry of readdirSync(managedAbs)) {
      const p = join(managedAbs, entry);
      try {
        if (statSync(p).isDirectory() && readdirSync(p).length === 0) rmdirSync(p);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

// -- 4. report to the transcript (informational; never blocks) -----------------
if (removed.length || report) {
  let msg = "";
  if (removed.length) msg += `worktree cleanup: removed ${removed.length} safe worktree(s).\n`;
  if (report)
    msg += `worktree cleanup: kept ${kept.length} with unsaved work (commit or remove manually):\n${report}`;
  process.stderr.write(msg);
}
process.exit(0);
