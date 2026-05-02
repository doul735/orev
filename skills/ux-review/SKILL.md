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

   - Cancer: release blocking or trust breaking UX failure
   - Polyp: localized flow gap that should be fixed before release
   - Cigarette: small UX habit or polish gap that compounds over time
   - effort metadata: quick, medium, high

5. Quick Win is effort metadata, not a risk class.

6. Confirm pathology definitions:

   - Cancer: systemic UX failure that breaks a core path or user trust
   - Polyp: localized flow or state gap that should be fixed before release
   - Cigarette: small UX habit or polish gap that compounds over time

7. If a hosted review runtime is available, run UX review from the artifacts and source context. Otherwise, perform local agent analysis and mark the report as fallback. Fallback self-review does not count as PD 5 or PD 7 release approval.

## Report Format

```markdown
## UX review: [feature]

### Summary
- Files reviewed: N
- Findings: N (Cancer X, Polyp Y, Cigarette Z)
- Pathology: Cancer X, Polyp Y, Cigarette Z

### Cigarette Stop Evidence
- Iteration / workflow: [run name]
- Counts this cycle: Cancer X, Polyp Y, Cigarette Z
- Cigarette fixed now: [list]
- Remaining Cigarette items: [list or none]
- Cleanup attempted: [what was tried]
- Zero Cancer / Polyp confirmation: [yes/no]
- Stop streak status: [counts toward streak / resets streak / wait for more evidence]

### Cancer
1. **Title** — lens: state handling
   - Current: ...
   - Suggestion: ...
   - effort: high
   - legacy: Major
   - Pathology: Cancer, blast radius / infection path / containment
   - Location: `file:line`

### Polyp
1. **Title** — lens: state handling
   - Current: ...
   - Suggestion: ...
   - effort: medium
   - legacy: Quick Win | Major
   - Pathology: Polyp, blast radius / infection path / containment
   - Location: `file:line`

### Cigarette
1. **Title** — lens: state handling
    - Current: ...
    - Suggestion: ...
    - effort: quick
    - legacy: Nice-to-have
    - Pathology: Cigarette, blast radius / infection path / containment
    - Fix this pass: yes
    - Remaining Cigarette items: ...
    - Cleanup attempt: ...
    - Zero Cancer / Polyp confirmation: yes
    - Location: `file:line`
```

## Rules

- Use code-confirmed facts only.
- Include file and line references where possible.
- Do not call direct provider APIs by default.
- Escalate Cancer findings to PD 7.
- Cigarette findings are fixed in the current pass when a fix workflow is used, and the report must document cycle evidence, counts, cleanup attempt, remaining items, and zero Cancer / Polyp confirmation before counting the streak.
