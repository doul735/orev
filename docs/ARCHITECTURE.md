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
- `ship`: review, fix, build, commit, PR, adversarial review
- `ship7`: `/ship` plus executable tests and stronger release gates

## Pathology Layer

Review findings can be classified with the pathology taxonomy:

- Cigarette: small harmful habit that should be cleaned up before it normalizes
- Polyp: localized actionable issue that can grow if ignored
- Cancer: systemic or release-blocking issue that needs containment

Pathology labels sit above existing severity labels. They help decide escalation and containment, not just priority wording.

See [Code Pathology Taxonomy](./PATHOLOGY_TAXONOMY.md).

## PD Tier Layer

PD tiers map change risk to workflow depth:

- PD 1: hygiene pass for Cigarette-only changes
- PD 3: standard review for normal feature work
- PD 5: ship candidate workflow for important or cross-file changes
- PD 7: release proof workflow for Cancer-class or high-risk changes

See [PD Workflow Tiers](./PD_TIERS.md).

## Production AI Review

Production adversarial review runs through OMO/OhMyOpenCode. OMO reads `orev` artifacts and selected source files, then runs GPT-5.5 Pro review through its subscription-backed runtime.

The direct `orev review --ai` provider path is experimental/self-hosted. It is not the production path.
