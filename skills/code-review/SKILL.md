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

5. If OMO is available, run GPT-5.5 Pro adversarial review from the artifacts and source context. Otherwise, perform direct local agent analysis and mark the report as fallback.

6. Verify each finding against the actual code before reporting it.

7. Assign a pathology class to each finding:

   - Cigarette: low blast-radius habit or repeated small debt
   - Polyp: localized actionable issue that can spread if ignored
   - Cancer: systemic, security-sensitive, data-loss, or release-blocking issue

## Report Format

```markdown
## code-review results

### Summary
- Changed files: N
- OMO review: success|fallback
- Results: MUST-FIX X, SHOULD-FIX Y, NIT Z
- Pathology: Cigarette X, Polyp Y, Cancer Z

### MUST-FIX
1. **Title** `file:line`
   - Problem: ...
   - Evidence: ...
   - Pathology: Cancer — blast radius / infection path / containment
   - Source: OMO GPT-5.5 Pro | local verification | static analysis
   - Recommendation: ...
```

## Rules

- Do not expose raw secrets.
- Do not report unverified findings as facts.
- Do not call direct provider APIs by default.
- Use `orev review --ai` only as an experimental/self-hosted path.
- Escalate Cancer findings to PD 7.
