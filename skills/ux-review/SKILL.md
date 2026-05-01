---
name: ux-review
description: Product and UX gap review using orev artifacts
argument-hint: "[optional file path or feature name]"
---

# ux-review

Review changed code for product completeness and UX gaps. This is not a security or performance review.

## Workflow

1. Collect changed scope:

   ```bash
   orev privacy gate . --verbose
   orev diff-scope . --out .orev/diff-scope.json --verbose
   orev context . --out .orev/context.json --verbose
   ```

2. Read changed files and nearby UX/product context.

3. Review seven lenses:

   - user scenario
   - state handling
   - mobile/responsive behavior
   - accessibility
   - edge cases
   - feature integration
   - feedback and interaction

4. Classify findings:

   - Quick Win: high impact, low effort
   - Major: high impact, higher effort
   - Nice-to-have: lower impact, low effort

5. If OMO is available, run GPT-5.5 Pro UX review from the artifacts and source context. Otherwise, perform local agent analysis and mark the report as fallback.

## Report Format

```markdown
## UX review: [feature]

### Summary
- Files reviewed: N
- Findings: N (Quick Win X, Major Y, Nice-to-have Z)

### Quick Win
1. **Title** — lens: state handling
   - Current: ...
   - Suggestion: ...
   - Location: `file:line`
```

## Rules

- Use code-confirmed facts only.
- Include file and line references where possible.
- Do not call direct provider APIs by default.
