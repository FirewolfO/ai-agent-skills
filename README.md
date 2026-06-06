# Personal Codex Skills

This repository keeps personal Codex skills under version control and provides an npm-installable CLI for installing them into Codex.

## Install From GitHub

```bash
npm install -g github:YOUR_GITHUB_USER/skills
codex-skills-install
```

Replace `YOUR_GITHUB_USER/skills` with your real GitHub repository path.

## Local Development

Clone the repository, then run:

```bash
npm install
npm run list
npm run install:skills
```

The installer copies every skill under `skills/` into:

```text
~/.agents/skills
```

## Commands

List bundled skills:

```bash
codex-skills-install --list
```

Install all bundled skills:

```bash
codex-skills-install
```

Install one skill:

```bash
codex-skills-install image-to-a4-pdf
```

Install into a custom directory:

```bash
codex-skills-install --target /path/to/skills
```

Preview changes:

```bash
codex-skills-install --dry-run
```

## Adding A Skill

Create a directory under `skills/`:

```text
skills/
└── my-skill/
    ├── SKILL.md
    └── scripts/
```

Every skill directory must contain a `SKILL.md` file with valid skill frontmatter.

## Publishing

For GitHub-based npm installs, push this repository to GitHub and install with:

```bash
npm install -g github:YOUR_GITHUB_USER/skills
```

If you later want to publish to the public npm registry, remove `"private": true`, choose an available package name, set the license you want, and run:

```bash
npm publish --access public
```
