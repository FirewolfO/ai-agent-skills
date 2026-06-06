#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const skillsRoot = path.join(packageRoot, "skills");
const defaultTarget = path.join(os.homedir(), ".agents", "skills");

function usage() {
  console.log(`Usage:
  codex-skills-install [skill-name ...] [--target DIR] [--dry-run]
  codex-skills-install --list

Options:
  --list        Show skills bundled in this package.
  --target DIR  Install into DIR instead of ~/.agents/skills.
  --dry-run     Print what would be installed without writing files.
  --help        Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    list: false,
    target: defaultTarget,
    names: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--list") {
      options.list = true;
      continue;
    }
    if (arg === "--target") {
      const value = argv[i + 1];
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

  return options;
}

function bundledSkills() {
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }

  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(skillsRoot, name, "SKILL.md")))
    .sort((a, b) => a.localeCompare(b));
}

function copySkill(name, target, dryRun) {
  const source = path.join(skillsRoot, name);
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

  if (options.list) {
    if (available.length === 0) {
      console.log("No skills bundled.");
      return;
    }
    for (const name of available) {
      console.log(name);
    }
    return;
  }

  const selected = options.names.length > 0 ? options.names : available;
  if (selected.length === 0) {
    throw new Error("No skills to install.");
  }

  for (const name of selected) {
    copySkill(name, options.target, options.dryRun);
  }
}

try {
  main();
} catch (error) {
  console.error(`codex-skills-install: ${error.message}`);
  process.exit(1);
}
