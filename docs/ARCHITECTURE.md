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
- `pd5`: SUX_review + tests + build + orev review + post-PR GitHub Codex gate (medium scope)
- `pd7`: save-context + SUX_review + tests + build + applicable E2E/equivalent proof + architecture + orev review + post-PR GitHub Codex gate (large/critical scope)
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
- PD 5: release candidate workflow for important or cross-file changes, with mandatory post-PR GitHub Codex merge gate
- PD 7: release proof workflow for Cancer-class, auth/payment/security/data, and high-risk changes, with Cancer-zero required from code-review, ux-review, SUX_review, and Codex
- PD 9: reserved custom variant slot
- Even tiers (2, 4, 6, 8): open community variant slots

See [PD Workflow Tiers](./PD_TIERS.md).

## Post-PR Codex Review

PD 5 and PD 7 require the official GitHub Codex reviewer/plugin after PR creation and before merge. The implementing agent must inspect both PR reviews and inline review comments, classify every Codex finding with the pathology taxonomy, and block merge while any Codex Cancer or Polyp remains open.

The packaged default setup path is documented in [External Reviewer Setup](./EXTERNAL_REVIEWERS.md). The direct `orev review --ai` provider path and Codex CLI preflight receipts are supporting evidence only. They do not replace the PD 5/7 post-PR GitHub Codex gate.
