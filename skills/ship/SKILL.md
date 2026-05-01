---
name: ship
description: Review, fix, build-check, commit, PR, and adversarial review workflow
argument-hint: "[optional commit message hint]"
---

# ship

Run a complete shipping workflow for AI-assisted changes.

## Workflow

1. Save current work context if your agent runtime supports it.
2. Run `SUX_review --fix` and apply selected fixes.
3. Run the project build or type-check command.
4. Commit on a feature branch and open or update a PR.
5. Run OMO GPT-5.5 Pro adversarial review using `orev` artifacts:

   ```bash
   orev privacy gate . --verbose
   orev diff-scope . --out .orev/diff-scope.json --verbose
   orev context . --out .orev/context.json --verbose
   ```

6. Fix MUST-FIX and SHOULD-FIX findings, then verify again.

## Rules

- Never push directly to `main` or `master`.
- Never force-push unless explicitly approved.
- Never expose raw secrets in reports.
- Direct provider/API review is not the default path.
