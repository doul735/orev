---
name: SUX_review
description: Parallel code-review and ux-review orchestration
argument-hint: "[--fix] [focus: security|performance|correctness|architecture|all] [optional target]"
---

# SUX Review

Run `code-review` and `ux-review` through the runtime's official skill or command invocation, not ad hoc agent calls, so their nested instructions are loaded. Keep them independent, then merge the results.
`orev review` without `--ai` is a deterministic artifact gate only, not semantic review.

## Workflow

1. Check whether there are changed files.
   - Use `git diff --name-only HEAD`, `git diff --name-only --cached`, and `git status --short` as the changed-files basis.
2. Launch `code-review` and `ux-review` in parallel through the official skill or command mechanism.
3. Combine summaries and findings.
4. Ask the user which findings to fix immediately.

## Output

```markdown
# SUX Review Results

## Evidence
- Invocation: [official skill or command used]
- Changed files basis: [git diff / cached diff / fallback range]
- code-review --fix applied: [yes/no]
- ux-review source: [changed files / fallback]

## Cigarette Stop Evidence
- Iteration / workflow: [run name]
- Counts this cycle: Cancer X, Polyp Y, Cigarette Z
- Cigarette fixed now: [list]
- Remaining Cigarette items: [list or none]
- Cleanup attempted: [what was tried]
- Zero Cancer / Polyp confirmation: [yes/no]
- Stop streak status: [counts toward streak / resets streak / wait for more evidence]

## Summary
| Review | Findings |
|---|---|
| code-review | Cancer X, Polyp Y, Cigarette Z |
| ux-review | Cancer X, Polyp Y, Cigarette Z |
| pathology | Cancer X, Polyp Y, Cigarette Z |

## code-review
...

## ux-review
...

## Routing
- Recommended PD tier: PD 1 | PD 3 | PD 5 | PD 7
- Reason: scope, severity, pathology, and confidence
```

## Rules

- Keep review tracks independent until reporting.
- If the security gate blocks code review, report the block without exposing raw secrets.
- UX review may continue if it can do so without exposing secrets.
- If `--fix` was used, report whether code-review actually ran with `--fix` and what evidence shows it.
- Any Cancer finding escalates the recommended workflow to PD 7.
- Cigarette findings are part of the immediate fix set, not the skip set. Report cycle counts, Cigarette items fixed now, remaining Cigarette items, cleanup attempt, and zero Cancer / Polyp confirmation before counting a streak.
