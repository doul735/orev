# PD Workflow Tiers

PD tiers decide how much review and verification a change deserves. The tier is based on risk, scope, and the canonical pathology class.

Note: `orev review` without `--ai` is a deterministic artifact, privacy, and context gate. It does not replace semantic review. PD 5 and PD 7 require an independent reviewer model or hosted review runtime; self-review by the implementing agent does not count as release approval. See `docs/EXTERNAL_REVIEWERS.md` for the supported Codex CLI setup path.

## Tier Matrix

| Tier | Use When | Default Skills | Gates | Pathology Fit |
|---|---|---|---|---|
| PD 1 | Tiny local change, docs, copy, trivial config, no runtime risk | `orev privacy gate`, optional `code-review` | privacy gate, targeted sanity check, documented Cigarette cleanup if present | Cigarette findings fixed in current pass |
| PD 3 | Normal feature or bug fix touching a few files | `code-review`, type check, orev deterministic artifact gate | privacy gate, diff/context, deterministic artifact issues, current-pass cleanup evidence | Cigarette + Polyp |
| PD 5 | Important feature, cross-file behavior, schema/API changes, medium confidence | `SUX_review`, independent reviewer gate, tests, build, orev deterministic artifact gate | tests, build, PR, mandatory cross-model semantic review, current-pass cleanup evidence | Polyp + possible Cancer |
| PD 7 | Large scope, critical release, auth/payment/data/security, confirmed Cancer from lower tier | save-context, `SUX_review`, independent reviewer gate, tests, build, applicable E2E or equivalent executable proof, architecture check, orev deterministic artifact gate | all PD 5 gates + executable tests + applicable E2E/equivalent coverage + architecture impact + Cancer-zero required | Cancer-zero |
| PD 9 | Reserved slot for community or organization variants | none by default | no default release gate; use PD 7 for highest default verification | custom |

Even-numbered tiers (PD 2, 4, 6, 8) and PD 9 are open slots for community-contributed workflow variants.

## Routing Rules

Start with the lowest tier that can safely contain the change, then escalate when evidence demands it.

### Escalate To PD 3

- more than one file changed
- behavior changes, not just text/docs
- any Polyp finding
- UX state or accessibility is affected

### Escalate To PD 5

- API, schema, storage, or service boundary changes
- major UX flow changes
- repeated Polyp findings in adjacent modules
- large diff or missing context reduces confidence
- PR is intended for release, not exploration

### Escalate To PD 7

- privacy gate BLOCK
- confirmed Cancer finding
- authentication, authorization, payment, billing, encryption, or data migration change
- executable behavior must be proven, not inferred
- previous review found a release-blocking issue and fixes need re-verification

## Tier Details

### PD 1: Hygiene Pass

Goal: keep small changes from accumulating Cigarette-class debt, while fixing Cigarette findings in the current pass and stopping only after 3 consecutive Cigarette-only review/fix cycles with evidence.

Recommended flow:

```bash
orev privacy gate . --verbose
orev diff-scope . --out .orev/diff-scope.json --verbose
```

Use for documentation, tiny copy fixes, low-risk config, and one-file cleanup. Cigarette findings are fixed now, not deferred.

### PD 3: Standard Review

Goal: review normal development with both code and UX lenses.

Recommended skills:

- `code-review`
- `ux-review`
- `SUX_review` when both tracks matter

Use for ordinary feature work and localized bug fixes. If the review report contains only Cigarette findings, fix them in the current pass, document the evidence, and count the cycle only when Cancer and Polyp are both zero.
`orev` clean means the deterministic artifact gate passed, not that semantic review passed.

### PD 5: Release Candidate

Goal: prepare a meaningful change for PR and release.

Recommended skill:

- `/pd5`

Use when the change needs build/type verification and mandatory independent semantic review, but executable test depth is not the primary release risk. Cigarette cleanup still happens in the current pass, with the stop streak documented. Any Cancer finding hard-stops PD 5 and requires mandatory escalation to PD 7 before release work can continue. If the independent reviewer model is unavailable, PD 5 is blocked rather than silently downgraded to self-review.
`orev` clean means the deterministic artifact gate passed, not that semantic review passed.

### PD 7: Release Proof

Goal: prove important or critical behavior works before release, including authentication, authorization, payment, billing, encryption, data migration, infrastructure, and Cancer-zero releases.

Recommended skill:

- `/pd7`

Use when correctness must be demonstrated through independent semantic review, executable tests, production build checks, applicable E2E or equivalent executable coverage, architecture impact analysis, and rerun review after fixes. Cigarette findings are fixed during the same pass, and any streak count requires evidence. code-review, ux-review, and SUX Cancer findings must be zero before merge.
`orev` clean means the deterministic artifact gate passed, not that semantic review passed.

### PD 9: Reserved Slot

Goal: reserve space for community or organization-specific variants.

Recommended skill:

- none by default

Do not use PD 9 as a default release workflow. Use PD 7 for authentication, authorization, payment, billing, encryption, data migration, infrastructure, Cancer-zero, and release-proof work.

## Output Contract

Every tiered review should report:

```markdown
### PD Tier
- Selected tier: PD 1 | PD 3 | PD 5 | PD 7
- Reason: [scope/risk/pathology evidence]
- Escalation trigger: [if any]

### Pathology Summary
- Cancer: N
- Polyp: N
- Cigarette: N

### Cigarette Stop Evidence
- Iteration / workflow: [PD tier and run name]
- Counts this cycle: Cancer X, Polyp Y, Cigarette Z
- Cigarette fixed now: [list]
- Remaining Cigarette items: [list or none]
- Cleanup attempted: [what was tried]
- Zero Cancer / Polyp confirmation: [yes/no]
- Stop streak status: [counts toward streak / resets streak / wait for more evidence]
```
