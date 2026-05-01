# Migration Roadmap

This document describes the public migration path from ad-hoc agent review prompts to the `orev` review and release workflow suite.

## Goal

Keep the user-facing skill names stable while moving review inputs to deterministic `orev` artifacts.

```text
pd5 / pd7 / pd9
  -> SUX_review
       -> code-review
       -> ux-review
  -> tests/build/E2E as required by tier
  -> orev review before commit
  -> commit/PR
  -> OMO GPT-5.5 Pro adversarial review

orev CLI
  -> privacy gate
  -> diff-scope artifact
  -> context manifest
  -> deterministic Markdown report
```

## Production Review Path

Production adversarial review is OMO/OhMyOpenCode subscription-backed orchestration. The target project does not need `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `--model claude` for the default production path.

The direct provider path, `orev review --ai`, remains available only as an experimental/self-hosted fallback.

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
- Review seven UX/planning lenses and classify findings as Quick Win, Major, or Nice-to-have.

### 5. SUX Review

- Run `/code-review` and `/ux-review` as independent review tracks.
- Merge results into one report.
- Let users choose immediate fixes.
- Summarize pathology counts and recommend a PD tier.

### 6. Pathology And PD Routing

- Classify review findings as Cigarette, Polyp, or Cancer.
- Use pathology to explain blast radius, infection path, and containment.
- Route workflow depth through PD 1, PD 3, PD 5, or PD 7.

### 7. PD Release Tiers

- `/pd1` through `/pd9` are the release workflow commands.
- Each tier runs progressively deeper verification (see `docs/PD_TIERS.md`).
- `/ship` and `/ship7` are deprecated and moved to `skills/_deprecated/`.

## Public Interface Contract

- `/code-review`, `/ux-review`, `/SUX_review` names remain stable.
- `/pd1`, `/pd3`, `/pd5`, `/pd7`, `/pd9` are the release workflow commands.
- Even-numbered tiers (2, 4, 6, 8) are community variant slots.
- Cigarette, Polyp, and Cancer are review-routing labels, not replacements for existing severity labels.
- `orev` artifacts are implementation details unless users opt into the CLI directly.
- Direct provider/API review is experimental and must warn users at runtime.

## Verification Checklist

- `npm test`
- `npm run build`
- `orev privacy gate .`
- scan for local paths, project-specific names, and real secrets before publishing
