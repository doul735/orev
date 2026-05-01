# PD Workflow Tiers

PD tiers decide how much review and verification a change deserves. The tier is based on risk, scope, and pathology class.

## Tier Matrix

| Tier | Use When | Default Skills | Gates | Pathology Fit |
|---|---|---|---|---|
| PD 1 | Tiny local change, docs, copy, trivial config, no runtime risk | `orev privacy gate`, optional `code-review` | privacy gate, targeted sanity check | Cigarette only |
| PD 3 | Normal feature or bug fix touching a few files | `code-review`, type check, orev review | privacy gate, diff/context, selected fixes | Cigarette + Polyp |
| PD 5 | Important feature, cross-file behavior, schema/API changes, medium confidence | `SUX_review`, tests, build, orev review | tests, build, PR, OMO adversarial review | Polyp + possible Cancer |
| PD 7 | Large scope, critical release, confirmed Cancer from lower tier | save-context, `SUX_review`, tests, build, E2E, orev review | executable tests, production build, E2E, OMO adversarial review | Cancer |
| PD 9 | Auth/payment/data/security, full package | save-context, `SUX_review`, tests, build, E2E, architecture check, orev review | all PD 7 gates + architecture impact + Cancer-zero required | Cancer-zero |

Even-numbered tiers (PD 2, 4, 6, 8) are open slots for community-contributed workflow variants.

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

Goal: keep small changes from accumulating Cigarette-class debt.

Recommended flow:

```bash
orev privacy gate . --verbose
orev diff-scope . --out .orev/diff-scope.json --verbose
```

Use for documentation, tiny copy fixes, low-risk config, and one-file cleanup.

### PD 3: Standard Review

Goal: review normal development with both code and UX lenses.

Recommended skills:

- `code-review`
- `ux-review`
- `SUX_review` when both tracks matter

Use for ordinary feature work and localized bug fixes.

### PD 5: Ship Candidate

Goal: prepare a meaningful change for PR and release.

Recommended skill:

- `ship`

Use when the change needs build/type verification and OMO adversarial review, but executable test depth is not the primary release risk.

### PD 7: Release Proof

Goal: prove important behavior works before release.

Recommended skill:

- `ship7`

Use when correctness must be demonstrated through executable tests, production build checks, and rerun review after fixes.

## Output Contract

Every tiered review should report:

```markdown
### PD Tier
- Selected tier: PD 1 | PD 3 | PD 5 | PD 7
- Reason: [scope/risk/pathology evidence]
- Escalation trigger: [if any]

### Pathology Summary
- Cigarette: N
- Polyp: N
- Cancer: N
```
