---
name: SUX_review
description: Parallel code-review and ux-review orchestration
argument-hint: "[--fix] [focus: security|performance|correctness|architecture|all] [optional target]"
---

# SUX Review

Run `code-review` and `ux-review` independently, then merge the results.

## Workflow

1. Check whether there are changed files.
2. Launch `code-review` and `ux-review` in parallel.
3. Combine summaries and findings.
4. Ask the user which findings to fix immediately.

## Output

```markdown
# SUX Review Results

## Summary
| Review | Findings |
|---|---|
| code-review | MUST-FIX X, SHOULD-FIX Y, NIT Z |
| ux-review | Quick Win X, Major Y, Nice-to-have Z |

## code-review
...

## ux-review
...
```

## Rules

- Keep review tracks independent until reporting.
- If the security gate blocks code review, report the block without exposing raw secrets.
- UX review may continue if it can do so without exposing secrets.
