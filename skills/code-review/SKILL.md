---
name: code-review
description: Context-first verified code review using orev artifacts
argument-hint: "[--fix] [focus: security|performance|correctness|architecture|all] [optional review goal]"
---

# code-review

Review changed code with project context, deterministic `orev` artifacts, and verified findings.

## Workflow

1. Run the privacy gate:

   ```bash
   orev privacy gate . --verbose
   ```

2. Collect diff and context artifacts:

   ```bash
   orev diff-scope . --out .orev/diff-scope.json --verbose
   orev context . --out .orev/context.json --verbose
   ```

3. Read the changed files and relevant local context.

4. Review six dimensions:

   - security
   - correctness
   - cross-file consistency
   - convention
   - performance
   - architecture

5. If a hosted review runtime is available, run adversarial review from the artifacts and source context. Otherwise, perform direct local agent analysis and mark the report as fallback. Fallback self-review does not count as PD 5 or PD 7 release approval.

6. When you invoke nested workflows such as code-review, ux-review, SUX_review, save-context, or commit from a PD tier, use the runtime's official skill or command invocation mechanism so the nested instructions are loaded.

7. Verify each finding against the actual code before reporting it.

8. Assign a pathology class to each finding:

   - Cancer: systemic, security-sensitive, data-loss, or release-blocking issue
   - Polyp: localized actionable issue that can spread if ignored
   - Cigarette: low blast-radius habit or repeated small debt

   Keep legacy labels only as secondary metadata, for example `legacy: MUST-FIX`, `legacy: SHOULD-FIX`, or `legacy: NIT`.

## Report Format

```markdown
## code-review results

### Summary
- Changed files: N
- Hosted review: success|fallback
- Results: Cancer X, Polyp Y, Cigarette Z
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
1. **Title** `file:line`
    - Problem: ...
    - Evidence: ...
    - Pathology: Cancer, blast radius / infection path / containment
    - Source: hosted review | local verification | static analysis
    - Recommendation: ...

### Polyp
1. **Title** `file:line`
   - Problem: ...
   - Evidence: ...
   - Pathology: Polyp, blast radius / infection path / containment
   - Source: hosted review | local verification | static analysis
   - Recommendation: ...

### Cigarette
1. **Title** `file:line`
    - Problem: ...
    - Evidence: ...
    - Fix this pass: yes
    - Remaining Cigarette items: ...
    - Cleanup attempt: ...
    - Zero Cancer / Polyp confirmation: yes
    - Pathology: Cigarette, blast radius / infection path / containment
    - Source: hosted review | local verification | static analysis
    - Recommendation: ...
```

## Rules

- Do not expose raw secrets.
- Do not report unverified findings as facts.
- Do not call direct provider APIs by default.
- Use `orev review --ai` only as an experimental/self-hosted path.
- Escalate Cancer findings to PD 7.
- Cigarette findings are fixed in the current pass when a fix workflow is used, and the report must document cycle evidence, counts, cleanup attempt, remaining items, and zero Cancer / Polyp confirmation before counting the streak.
