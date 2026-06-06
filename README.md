# Personal Codex Skills

This repository is a collection of independently installable Codex skills. Its npm CLI can install the complete collection or selected skills.

## Install The Collection

```bash
npm install -g github:YOUR_GITHUB_USER/skills
codex-skills install all
```

Replace `YOUR_GITHUB_USER/skills` with your real GitHub repository path.

## Install One Skill

Without permanently installing the collection CLI:

```bash
npm exec --yes --package=github:YOUR_GITHUB_USER/skills -- \
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

## Local Development

Clone the repository, then run:

```bash
npm install
npm run list
npm run install:skills
npm test
```

The installer copies every skill under `skills/` into:

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

Create a directory under `skills/`:

```text
skills/
└── my-skill/
    ├── SKILL.md
    └── scripts/
```

Every skill directory must contain a `SKILL.md` file with valid skill frontmatter.

The installer discovers skills dynamically, so adding a valid directory under `skills/` automatically makes it available to both collection and individual installation.

## Publishing

For GitHub-based npm installs, push this repository to GitHub and install with:

```bash
npm install -g github:YOUR_GITHUB_USER/skills
```

If you later want to publish to the public npm registry, remove `"private": true`, choose an available package name, set the license you want, and run:

```bash
npm publish --access public
```
