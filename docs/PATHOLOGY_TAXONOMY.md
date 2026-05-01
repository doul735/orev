# Code Pathology Taxonomy

The pathology taxonomy is a prioritization lens for review findings. It does not replace existing severity labels such as MUST-FIX, SHOULD-FIX, NIT, Quick Win, Major, or Nice-to-have. It explains how likely a finding is to spread, compound, or block release.

## The Three Classes

| Class | Meaning | Typical Handling |
|---|---|---|
| Cigarette | Small harmful habit. It may not break the release today, but repeated exposure degrades maintainability or UX. | Fix opportunistically in PD 1/3. Batch with nearby cleanup. |
| Polyp | Localized abnormal growth. It is not systemic yet, but it is actionable and can become expensive if ignored. | Fix before feature release in PD 3/5. Add tests when behavior is affected. |
| Cancer | Invasive or systemic risk. It can spread across modules, compromise trust, or cause production failure. | Block release. Escalate to PD 7. Require containment, verification, and rerun review. |

## Classification Rules

### Cigarette

Use Cigarette when the issue is low blast-radius and mostly habit-forming:

- duplicated small helper logic
- unclear naming that slows future work
- missing micro-copy or minor feedback
- small style drift from local conventions
- low-risk NIT that appears repeatedly

Do not call something Cigarette if it can silently corrupt data, bypass authorization, leak secrets, or break a core flow.

### Polyp

Use Polyp when the issue is localized but materially actionable:

- missing loading/error/empty state in a changed flow
- fragile cross-file assumption
- untested business rule
- medium-risk API or schema mismatch
- repeated pattern likely to affect adjacent features

Polyp findings should usually be fixed before shipping a feature branch.

### Cancer

Use Cancer when the issue is systemic, security-sensitive, or release-blocking:

- secret exposure or privacy gate BLOCK
- authentication or authorization bypass
- payment, billing, or data-loss risk
- schema/storage changes that can corrupt existing data
- cross-module infection where one broken contract affects multiple callers
- large diff with missing context in high-risk files

Cancer findings require containment: stop the release, identify spread, fix root cause, rerun verification, and document residual risk.

## Spread Risk

Each finding should answer three questions:

1. **Blast radius**: Which files, flows, users, or data can be affected?
2. **Infection path**: How can this issue spread to adjacent modules or future work?
3. **Containment**: What small boundary, test, type, or workflow gate stops the spread?

## Mapping To Existing Labels

| Existing Label | Common Pathology Mapping |
|---|---|
| NIT | Cigarette |
| SHOULD-FIX | Polyp, sometimes Cigarette |
| MUST-FIX | Cancer, sometimes Polyp |
| Quick Win | Cigarette or Polyp |
| Major | Polyp or Cancer |
| Nice-to-have | Cigarette |
| Privacy BLOCK | Cancer |

The mapping is advisory. If impact and spread risk disagree, trust spread risk.

## Report Template

```markdown
### Pathology
- Class: Cigarette | Polyp | Cancer
- Blast radius: [files/users/data/flows affected]
- Infection path: [how it spreads]
- Containment: [test/type/check/workflow gate]
```

## Public Language

Use the pathology terms as memorable shorthand, but keep reports professional. Pair each term with concrete evidence and containment steps.
