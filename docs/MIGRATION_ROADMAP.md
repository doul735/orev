# Migration Roadmap

This document describes the public migration path from ad-hoc agent review prompts to the `orev` review and release workflow suite.

## Goal

Keep the user-facing skill names stable while moving review inputs to deterministic `orev` artifacts.

```text
pd5 / pd7
  -> SUX_review
       -> code-review
       -> ux-review
  -> mandatory independent adversarial review for PD 5/7
  -> tests/build/E2E as required by tier
  -> orev review before commit
  -> commit/PR

orev CLI
  -> privacy gate
  -> diff-scope artifact
  -> context manifest
  -> deterministic Markdown report
```

## Production Review Path

Hosted adversarial review can run through OMO/OhMyOpenCode or another external review runtime. The target project does not need `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `--model claude` for the default deterministic workflow.

The direct provider path, `orev review --ai`, remains experimental/self-hosted supporting evidence only. It is not a PD 5 or PD 7 release-approval fallback; use the independent reviewer setup in `docs/EXTERNAL_REVIEWERS.md` for that gate.

## Stages

### 1. Privacy Gate

- Add `orev privacy gate [target]`.
- Write `.orev/privacy-report.md`.
- Block raw secret exposure before review.

### 2. Diff And Context Artifacts

- Add `orev diff-scope [target] --out .orev/diff-scope.json`.
- Add `orev context [target] --out .orev/context.json`.
- Keep artifacts deterministic and bounded.

### 3. Code Review Skill

- Keep `/code-review` as the user-facing command.
- Replace ad-hoc diff collection with `orev` artifacts.
- Verify findings against real files before reporting.

### 4. UX Review Skill

- Keep `/ux-review` as the user-facing command.
- Use the same privacy/diff/context artifacts.
- Review seven UX/planning lenses and classify findings by canonical pathology, while keeping effort metadata such as quick, medium, or high.

### 5. SUX Review

- Run `/code-review` and `/ux-review` as independent review tracks.
- Merge results into one report.
- Let users choose immediate fixes.
- Summarize pathology counts and recommend a PD tier.

### 6. Pathology And PD Routing

- Classify review findings as Cancer, Polyp, or Cigarette.
- Use pathology to explain blast radius, infection path, and containment.
- For Cigarette findings, fix them in the current pass and document the review/fix cycle evidence. Stop only after 3 consecutive Cigarette-only cycles with zero Cancer and zero Polyp findings.
- Route workflow depth through PD 1, PD 3, PD 5, or PD 7.

### 7. PD Release Tiers

- `/pd1`, `/pd3`, `/pd5`, and `/pd7` are the default release workflow commands.
- Each tier runs progressively deeper verification (see `docs/PD_TIERS.md`).
- `/pd9` is a reserved custom variant slot like PD 2/4/6/8.
- `/ship` and `/ship7` are deprecated and moved to `skills/_deprecated/`.

## Public Interface Contract

- `/code-review`, `/ux-review`, `/SUX_review` names remain stable.
- `/pd1`, `/pd3`, `/pd5`, `/pd7` are the default release workflow commands.
- Even-numbered tiers (2, 4, 6, 8) and PD 9 are community variant slots.
- Cigarette, Polyp, and Cancer are the canonical PD routing and release labels. Legacy severity or priority labels may appear only as secondary metadata during migration. Cigarette is routed as current-pass cleanup, not as a skip or ignore class.
- `orev` artifacts are implementation details unless users opt into the CLI directly.
- Direct provider/API review is experimental and must warn users at runtime.

## Verification Checklist

- `npm test`
- `npm run build`
- `orev privacy gate .`
- scan for local paths, project-specific names, and real secrets before publishing
