# Architecture

`orev` is a two-layer system.

## CLI Layer

The CLI creates deterministic local artifacts:

- `privacy gate`: scans added diff lines and `.env` files in the diff
- `diff-scope`: captures git diff metadata
- `context`: builds a bounded context manifest
- `review`: writes a deterministic Markdown report

## Skill Layer

The skill suite orchestrates agent work:

- `code-review`: security and code-quality review
- `ux-review`: product and UX gap review
- `SUX_review`: parallel integrated review
- `pd1`, `pd3`, `pd5`, `pd7`: default release workflows with escalating verification depth
- `pd1`: privacy gate + commit, with current-pass Cigarette cleanup for hygiene changes
- `pd3`: code-review + type check + orev review (normal features)
- `pd5`: SUX_review + tests + build + orev review (medium scope)
- `pd7`: save-context + SUX_review + independent reviewer + tests + build + E2E + architecture + orev review (large/critical scope)
- `pd9`: reserved custom variant slot

## Pathology Layer

Review findings can be classified with the pathology taxonomy:

- Cancer: systemic or release-blocking issue that needs containment
- Polyp: localized actionable issue that can grow if ignored
- Cigarette: small harmful habit that should be cleaned up in the current pass, then counted through the 3-cycle stop rule with evidence

Pathology is the canonical PD routing and release taxonomy. Legacy labels may still appear during migration, but only as secondary metadata.

See [Code Pathology Taxonomy](./PATHOLOGY_TAXONOMY.md).

## PD Tier Layer

PD tiers map change risk to workflow depth:

- PD 1: hygiene pass for Cigarette-only changes, fixed now, not deferred
- PD 3: standard review for normal feature work
- PD 5: release candidate workflow for important or cross-file changes, with mandatory independent reviewer approval
- PD 7: release proof workflow for Cancer-class, auth/payment/security/data, and high-risk changes, with Cancer-zero required from code-review, ux-review, and SUX_review
- PD 9: reserved custom variant slot
- Even tiers (2, 4, 6, 8): open community variant slots

See [PD Workflow Tiers](./PD_TIERS.md).

## Independent Review

PD 5 and PD 7 require an independent reviewer model or hosted review runtime to read `orev` artifacts and selected source files, then run adversarial review outside the implementing agent's self-review loop.

The direct `orev review --ai` provider path is experimental/self-hosted. It is not required for the default deterministic workflow.
