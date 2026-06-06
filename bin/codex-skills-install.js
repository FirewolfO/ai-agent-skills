#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const ignoredRootDirectories = new Set([".git", "bin", "node_modules", "test"]);
const defaultTarget = path.join(os.homedir(), ".agents", "skills");

function usage() {
  console.log(`Usage:
  codex-skills list
  codex-skills install all [--target DIR] [--dry-run]
  codex-skills install <skill-name ...> [--target DIR] [--dry-run]

Backward-compatible:
  codex-skills-install [skill-name ...] [--target DIR] [--dry-run]
  codex-skills-install --list

Options:
  --list        Show skills bundled in this collection.
  --target DIR  Install into DIR instead of ~/.agents/skills.
  --dry-run     Print what would be installed without writing files.
  --help        Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    command: "install",
    dryRun: false,
    target: defaultTarget,
    names: [],
  };

  const args = [...argv];
  if (args[0] === "list") {
    options.command = "list";
    args.shift();
  } else if (args[0] === "install") {
    args.shift();
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--list") {
      options.command = "list";
      continue;
    }
    if (arg === "--target") {
      const value = args[i + 1];
      if (!value) {
        throw new Error("--target requires a directory");
      }
      options.target = path.resolve(value.replace(/^~(?=$|\/)/, os.homedir()));
      i += 1;
      continue;
    }
    if (arg.startsWith("--target=")) {
      const value = arg.slice("--target=".length);
      options.target = path.resolve(value.replace(/^~(?=$|\/)/, os.homedir()));
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    options.names.push(arg);
  }

  if (options.command === "list" && options.names.length > 0) {
    throw new Error("list does not accept skill names");
  }

  return options;
}

function bundledSkills() {
  return fs
    .readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignoredRootDirectories.has(entry.name))
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(packageRoot, name, "SKILL.md")))
    .sort((a, b) => a.localeCompare(b));
}

function copySkill(name, target, dryRun) {
  const source = path.join(packageRoot, name);
  const destination = path.join(target, name);

  if (!fs.existsSync(path.join(source, "SKILL.md"))) {
    throw new Error(`Skill not found in package: ${name}`);
  }

  if (dryRun) {
    console.log(`[dry-run] ${source} -> ${destination}`);
    return;
  }

  fs.mkdirSync(target, { recursive: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (filePath) => !filePath.includes(`${path.sep}__pycache__${path.sep}`) && !filePath.endsWith(`${path.sep}__pycache__`),
  });
  console.log(`Installed ${name} -> ${destination}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const available = bundledSkills();

  if (options.command === "list") {
    if (available.length === 0) {
      console.log("No skills bundled.");
      return;
    }
    for (const name of available) {
      console.log(name);
    }
    return;
  }

  const requested = options.names.filter((name) => name !== "all");
  if (options.names.includes("all") && options.names.length > 1) {
    throw new Error('"all" cannot be combined with individual skill names');
  }

  const selected = options.names.length === 0 || options.names[0] === "all" ? available : requested;
  if (selected.length === 0) {
    throw new Error("No skills to install.");
  }

  const missing = selected.filter((name) => !available.includes(name));
  if (missing.length > 0) {
    throw new Error(
      `Unknown skill${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Available: ${available.join(", ")}`
    );
  }

  for (const name of selected) {
    copySkill(name, options.target, options.dryRun);
  }

  if (!options.dryRun) {
    console.log(`Installed ${selected.length} skill${selected.length === 1 ? "" : "s"}.`);
  }
}

try {
  main();
} catch (error) {
  console.error(`codex-skills-install: ${error.message}`);
  process.exit(1);
}
