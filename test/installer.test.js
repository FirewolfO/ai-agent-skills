import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, "..");
const cli = path.join(root, "bin", "codex-skills-install.js");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

const listed = run(["list"]);
assert.equal(listed.status, 0, listed.stderr);
assert.match(listed.stdout, /^image-to-a4-pdf$/m);

const target = fs.mkdtempSync(path.join(os.tmpdir(), "codex-skills-test-"));
try {
  const all = run(["install", "all", "--target", target]);
  assert.equal(all.status, 0, all.stderr);
  assert.ok(fs.existsSync(path.join(target, "image-to-a4-pdf", "SKILL.md")));

  const oneTarget = path.join(target, "single");
  const one = run(["install", "image-to-a4-pdf", "--target", oneTarget]);
  assert.equal(one.status, 0, one.stderr);
  assert.ok(fs.existsSync(path.join(oneTarget, "image-to-a4-pdf", "SKILL.md")));

  const unknown = run(["install", "not-a-skill", "--target", target]);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /Unknown skill: not-a-skill/);
} finally {
  fs.rmSync(target, { recursive: true, force: true });
}

console.log("Installer tests passed.");
