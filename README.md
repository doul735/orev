# orev

![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

**The open-source release workflow for AI coding agents.**

`orev` helps you stop shipping AI-generated code like a toy project. Use it directly as a privacy-gated CLI, or adapt its PD-tier review workflow into your own Claude Code, Cursor, Codex, or custom agent setup.

```text
small change      -> /pd1
normal bugfix     -> /pd3
feature work      -> /pd5
release proof     -> /pd7
auth/payment/data -> /pd9
```

## Why

AI coding agents make code changes fast. Release discipline still has to be deliberate.

`orev` gives agent-driven development a repeatable release gate:

- block secrets before review
- collect deterministic diff and context artifacts locally
- review code and UX separately
- classify findings by spread risk: Cigarette, Polyp, Cancer
- choose a PD tier based on change risk
- verify with tests/build before release

## Two Ways To Use It

### 1. Install The CLI

Use `orev` as a local review artifact engine.

```bash
npm install -g orev
orev privacy gate .
orev diff-scope . --out .orev/diff-scope.json
orev context . --out .orev/context.json
orev review . --out /tmp/orev-review.md
```

The CLI does not call an LLM by default. It creates deterministic local artifacts that an agent or reviewer can inspect.

### 2. Adapt The Workflow

If you already have an agent setup, treat this repo as a workflow reference.

Ask your coding agent:

```text
Read https://github.com/doul735/orev and adapt the PD workflow to our local AI coding environment.
Preserve privacy gates, pathology classification, progressive delivery tiers, and evidence-before-completion verification.
```

Start with:

- [PD Workflow Tiers](./docs/PD_TIERS.md)
- [Code Pathology Taxonomy](./docs/PATHOLOGY_TAXONOMY.md)
- [skills/](./skills)

## What Is Included

`orev` has two layers.

| Layer | Purpose |
|---|---|
| CLI engine | `privacy gate`, `diff-scope`, `context`, deterministic `review` |
| Skill suite | `pd1` through `pd9`, `code-review`, `ux-review`, `SUX_review` |

The CLI prepares safe local artifacts. The skills orchestrate review, fixes, tests, pull requests, and final adversarial review.

## PD Release Tiers

| Tier | Use For | Gate |
|---|---|---|
| PD 1 | docs, config, one-liners | privacy gate |
| PD 3 | normal feature or bug fix | code review + type check |
| PD 5 | medium feature work | SUX review + tests + build |
| PD 7 | large or high-confidence release | full verification + E2E when needed |
| PD 9 | auth, payment, security, data migration | Cancer-zero required |

Even-numbered tiers, PD 2/4/6/8, are open slots for community variants.

## Code Pathology

Review findings are classified by spread risk:

| Class | Meaning | Response |
|---|---|---|
| Cigarette | Small harmful habit | clean up before it normalizes |
| Polyp | Localized actionable risk | fix before release |
| Cancer | Systemic or release-blocking risk | contain, verify, escalate |

This does not replace `MUST-FIX`, `SHOULD-FIX`, or `NIT`. It explains how hard the issue can spread.

## Skill Commands

Install or adapt the skill files under `skills/` into your agent runtime.

```text
/pd1          # docs, config, one-liner
/pd3          # normal feature/bug fix
/pd5          # medium scope, tests + build
/pd7          # large scope, full verification
/pd9          # critical auth/payment/data/security work

/code-review  # code quality + security
/ux-review    # UX gap analysis
/SUX_review   # parallel code + UX review
```

Deprecated `ship` and `ship7` templates are kept under `skills/_deprecated/` for migration reference only.

## Use With OMO

The recommended production adversarial review path is OMO, OhMyOpenCode:

1. `orev` creates privacy-gated local artifacts.
2. OMO reads those artifacts and selected source files.
3. GPT-5.5 Pro performs adversarial review through the OMO runtime.
4. The skill suite verifies findings, applies selected fixes, and runs tests/build before release.

OMO is optional for external users. The deterministic CLI and PD workflow can be used without OMO.

## CLI Reference

### `orev privacy gate [target]`

Scans the target diff for secrets and writes `.orev/privacy-report.md` by default.

Useful options:

- `--out <path>`: Markdown privacy report output path
- `--no-fail-on-block`: write a blocked report but exit `0`
- `--verbose`: print execution details

### `orev diff-scope [target]`

Collects deterministic git diff metadata without calling network or AI services.

Useful options:

- `--out <path>`: JSON artifact output path
- `--format summary|json`: stdout format
- `--verbose`: print execution details

### `orev context [target]`

Builds a bounded context manifest from changed files and root project metadata. The artifact intentionally excludes raw file contents.

Useful options:

- `--out <path>`: JSON artifact output path
- `--max-files <number>`: maximum context files, default `20`
- `--max-bytes <number>`: maximum context bytes, default `200000`
- `--include-tests`: include test files in the context manifest

### `orev review [target]`

Writes a deterministic Markdown report. By default this command does not call an LLM.

Useful options:

- `--out <path>`: Markdown report output path. `orev` refuses to write review reports inside the target project.
- `--fail-on-secrets` / `--no-fail-on-secrets`: control secret-block exit behavior.
- `--verbose`: print target, git, and context counts.

## Self-Hosted `--ai` Experimental

`orev review --ai` is an experimental/self-hosted direct-provider path. It is kept for local experiments, fake-provider tests, and users who explicitly want to operate their own provider credentials.

When used, the CLI prints:

```text
--ai direct provider is experimental. Production reviews run via OMO (OhMyOpenCode).
```

The built-in `claude` provider path reads `ANTHROPIC_API_KEY` only when this route is explicitly used. Tests do not call real external APIs.

## Docs

- [Getting Started](./docs/GETTING_STARTED.md)
- [Adapt This Workflow](./docs/ADAPT_THIS_WORKFLOW.md)
- [PD Workflow Tiers](./docs/PD_TIERS.md)
- [Code Pathology Taxonomy](./docs/PATHOLOGY_TAXONOMY.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Acknowledgements](./docs/ACKNOWLEDGEMENTS.md)

## Development

```bash
npm test
npm run build
```

Generated `dist/` files are ignored in git. They are included in the npm package via the `files` field after `npm run build`.

## Acknowledgements

Most of `orev` is original work, including the CLI engine, PD tier model, code pathology taxonomy, privacy-gated artifact flow, and OMO-based review workflow.

Some development workflow ideas were influenced by public Claude Code skill projects. See [Acknowledgements](./docs/ACKNOWLEDGEMENTS.md).

## License

MIT. See [LICENSE](./LICENSE).
