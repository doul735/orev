# Getting Started

This guide gets you from zero to a local privacy-gated review report.

## 1. Install

```bash
npm install -g orev
```

For local development from source:

```bash
npm install
npm run build
```

## 2. Run The Privacy Gate

```bash
orev privacy gate . --verbose
```

This scans the current target for secret-like values in changed lines and `.env` files in the diff. It writes `.orev/privacy-report.md` by default.

## 3. Generate Review Artifacts

```bash
orev diff-scope . --out .orev/diff-scope.json --verbose
orev context . --out .orev/context.json --verbose
```

The artifacts are deterministic and local. The context manifest intentionally excludes raw file contents.

## 4. Write A Deterministic Review Report

```bash
orev review . --out /tmp/orev-review.md --verbose
```

`orev review` does not call an LLM by default. It gives your coding agent or reviewer a safe starting point.

## 5. Use The Skill Suite

Install or adapt the skill files under `skills/` into your agent runtime.

Start with:

```text
/pd3        normal feature or bug fix
/pd7        release proof for large changes
/SUX_review parallel code + UX review
```

Use `/pd7` for authentication, authorization, payment, billing, encryption, data migration, infrastructure changes, or Cancer-zero releases. `/pd9` is reserved for custom variants.

## 6. Keep Generated Files Out Of Git

Generated artifacts live under `.orev/`. The repo `.gitignore` excludes them.

## Next

- Read [PD Workflow Tiers](./PD_TIERS.md)
- Read [Code Pathology Taxonomy](./PATHOLOGY_TAXONOMY.md)
- If you do not want to install the CLI, read [Adapt This Workflow](./ADAPT_THIS_WORKFLOW.md)
