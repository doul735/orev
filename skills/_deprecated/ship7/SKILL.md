---
name: ship7
description: ship plus executable tests and stronger release verification
argument-hint: "[optional commit message hint]"
---

# ship7

`ship7` is the stronger release workflow. It requires executable tests, not just type checks.

## Workflow

1. Save current work context if your agent runtime supports it.
2. Run `SUX_review --fix` and apply selected fixes.
3. Detect and run executable tests:

   - `pytest` for Python projects
   - `npm test`, `pnpm test`, or `vitest run` for Node projects
   - project-specific test commands when documented

4. Run production build checks when available.
5. Commit on a feature branch and open or update a PR.
6. If available, run hosted adversarial review using `orev` artifacts:

   ```bash
   orev privacy gate . --verbose
   orev diff-scope . --out .orev/diff-scope.json --verbose
   orev context . --out .orev/context.json --verbose
   ```

7. Fix MUST-FIX and SHOULD-FIX findings, then rerun tests/build.

## PD Tier

`ship7` is the PD 7 workflow. Use it for confirmed Cancer findings, auth/payment/data/security work, large diffs, or release candidates that need executable proof.

Cancer findings require containment before release:

1. identify blast radius
2. identify infection path
3. fix root cause
4. rerun executable tests and hosted review

## Rules

- Executable tests are the primary gate.
- Build failures block shipping.
- Never push directly to `main` or `master`.
- Direct provider/API review is not the default path.
- PD 7 is mandatory for Cancer-class release risk.
