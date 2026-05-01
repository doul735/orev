# orev

![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

`orev` is an open review and ship workflow suite for AI coding agents. It combines privacy-gated review artifacts, code review, UX review, and ship7-style release verification.

## What

`orev` has two layers:

- **CLI engine**: deterministic `privacy gate`, `diff-scope`, `context`, and review report commands.
- **Skill suite**: reusable agent workflows for `code-review`, `ux-review`, `SUX_review`, `ship`, and `ship7`.

The CLI prepares safe local artifacts. The skills orchestrate review, fixes, tests, pull requests, and final adversarial review.

## Why

AI coding agents need a repeatable release gate, not just one-off code generation. `orev` focuses on:

- privacy before review: block secrets before any AI review step
- deterministic context: collect diff and context artifacts locally
- review separation: code-quality review and UX/planning review are separate
- ship discipline: tests/build/PR/adversarial review happen before release
- OMO-first production review: production adversarial review runs through OhMyOpenCode (OMO), not project-local API keys

## Install

```bash
npm install
npm run build
```

For local development:

```bash
npm test
npm run build
```

The package requires Node.js 20 or newer.

## Quick Start

Generate privacy and review artifacts for the current project:

```bash
orev privacy gate .
orev diff-scope . --out .orev/diff-scope.json
orev context . --out .orev/context.json
orev review . --out /tmp/orev-review.md
```

Run the suite workflow by installing the skill files under `skills/` into your agent runtime and invoking:

```text
/code-review
/ux-review
/SUX_review
/ship
/ship7
```

## Use With OMO

The recommended production path is OMO (OhMyOpenCode):

1. `orev` creates privacy-gated local artifacts.
2. OMO reads those artifacts and the real files selected by the workflow.
3. GPT-5.5 Pro performs the adversarial review through the OMO subscription-backed runtime.
4. The skill suite verifies findings, applies selected fixes, and runs tests/build before shipping.

Production OMO reviews do **not** require `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `--model claude` in the target project.

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
⚠ --ai direct provider is experimental. Production reviews run via OMO (OhMyOpenCode).
```

The built-in `claude` provider path reads `ANTHROPIC_API_KEY` only when this experimental direct-provider route is explicitly used. Tests do not call real external APIs.

## Architecture

```text
skills/ship7
  -> skills/SUX_review
       -> skills/code-review
       -> skills/ux-review
  -> tests/build
  -> commit/PR
  -> OMO GPT-5.5 Pro adversarial review

orev CLI
  -> privacy gate
  -> diff-scope artifact
  -> context manifest
  -> deterministic report
```

`orev` stores generated artifacts in `.orev/`. That directory is ignored by git.

## Development

```bash
npm test
npm run build
```

Generated `dist/` files are ignored in git. They are included in the npm package via the `files` field after `npm run build`.

## License

MIT. See [LICENSE](./LICENSE).
