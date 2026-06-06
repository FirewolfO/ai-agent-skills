# AI Agent Skills

This repository is a collection of independently installable AI agent skills. Its npm CLI can install the complete collection or selected root-level skill directories.

## Repository Layout

```text
ai-agent-skills/
├── bin/
│   └── codex-skills-install.js
├── image-to-a4-pdf/
│   ├── SKILL.md
│   └── scripts/
├── test/
├── package.json
└── README.md
```

Each root-level directory with a `SKILL.md` file is a standalone skill. Keeping one skill per directory makes the repository usable as both a complete collection and a source for single-skill installs.

## Install The Collection

```bash
npm install -g github:FirewolfO/ai-agent-skills
codex-skills install all
```

This copies every root-level skill into `~/.agents/skills`.

## Install One Skill

Without permanently installing the collection CLI:

```bash
npm exec --yes --package=github:FirewolfO/ai-agent-skills -- \
  codex-skills install image-to-a4-pdf
```

With the collection CLI installed globally:

```bash
codex-skills install image-to-a4-pdf
```

You can install several selected skills together:

```bash
codex-skills install image-to-a4-pdf another-skill
```

To install into a different local skills directory:

```bash
codex-skills install image-to-a4-pdf --target /path/to/skills
```

## Local Development

Clone the repository, then run:

```bash
npm install
npm run list
npm run install:skills
npm test
```

The installer copies every root-level skill into:

```text
~/.agents/skills
```

## Commands

List all skills in the collection:

```bash
codex-skills list
```

Install all bundled skills:

```bash
codex-skills install all
```

Install one skill:

```bash
codex-skills install image-to-a4-pdf
```

Install into a custom directory:

```bash
codex-skills install all --target /path/to/skills
```

Preview changes:

```bash
codex-skills install image-to-a4-pdf --dry-run
```

The older `codex-skills-install` command remains available for compatibility.

## Adding A Skill

Create a directory at the repository root:

```text
my-skill/
├── SKILL.md
└── scripts/
```

Every skill directory must contain a `SKILL.md` file with valid skill frontmatter.

The installer discovers skills dynamically, so adding a valid root-level skill directory automatically makes it available to both collection and individual installation.

You can verify discovery after adding a skill with:

```bash
npm run list
npm test
```

## Publishing

For GitHub-based npm installs, push this repository to GitHub and install with:

```bash
npm install -g github:FirewolfO/ai-agent-skills
```

If you later want to publish to the public npm registry, remove `"private": true`, choose an available package name, set the license you want, and run:

```bash
npm publish --access public
```
