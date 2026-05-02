# Code Pathology Taxonomy

The pathology taxonomy is the canonical PD routing and release taxonomy for review findings. Legacy labels such as MUST-FIX, SHOULD-FIX, NIT, Quick Win, Major, and Nice-to-have may still appear during migration, but only as secondary metadata.

## The Three Classes

| Class | Meaning | Typical Handling |
|---|---|---|
| Cancer | Invasive or systemic risk. It can spread across modules, compromise trust, or cause production failure. | Block release. Contain first, then rerun review. Escalate to PD 7 as needed. |
| Polyp | Localized abnormal growth. It is not systemic yet, but it is actionable and can become expensive if ignored. | Fix before feature release in PD 3/5. Add tests when behavior is affected. |
| Cigarette | Small harmful habit. It may not break the release today, but repeated exposure degrades maintainability or UX. | Fix in the current pass. Count review/fix cycles, not finding count. Stop after 3 consecutive Cigarette-only review/fix cycles with documented evidence. |

## Classification Rules

### Cigarette

Use Cigarette when the issue is low blast-radius and mostly habit-forming:

- duplicated small helper logic
- unclear naming that slows future work
- missing micro-copy or minor feedback
- small style drift from local conventions
- low-risk NIT that appears repeatedly

Do not call something Cigarette if it can silently corrupt data, bypass authorization, leak secrets, or break a core flow.

Quick Win is effort metadata, not a risk class. Do not map it directly to Cigarette without checking spread risk.

### Cigarette Stop Rule

Count review/fix cycles, not finding count. A cycle counts toward the Cigarette stop streak only when the review report contains Cigarette findings and zero Cancer or Polyp findings, all Cigarette findings are fixed in the current pass, reasonable cleanup was attempted, and evidence is documented. If the next review is clean, the cleanup loop terminates successfully and the workflow continues. If the next review still contains Cigarette-only findings, start the next cycle. After 3 consecutive Cigarette-only review/fix cycles, stop the loop and report the remaining Cigarette risk instead of chasing diminishing returns. Any Cancer or Polyp finding is outside this stop rule, resets the Cigarette-only streak, and follows normal containment or fix-before-release routing.

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
| Quick Win | effort: quick, not a risk class |
| Major | effort: medium |
| Nice-to-have | effort: low, not a risk class |
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

Use the pathology terms as the primary PD and release routing labels. Keep legacy labels only as secondary metadata, and always pair each class with concrete evidence and containment steps. For Cigarette, document the cycle number, the Cancer/Polyp/Cigarette counts, what was fixed now, any remaining Cigarette items, the cleanup attempt, and the zero Cancer/Polyp confirmation.
