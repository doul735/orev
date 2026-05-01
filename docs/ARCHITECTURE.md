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
- `pd1` through `pd9`: release workflows with escalating verification depth
- `pd1`: privacy gate + commit (docs/config)
- `pd3`: code-review + type check + orev review (normal features)
- `pd5`: SUX_review + tests + build + orev review (medium scope)
- `pd7`: save-context + SUX_review + tests + build + E2E + orev review (large scope)
- `pd9`: full package + architecture check + Cancer-zero gate (auth/payment/security)

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
- PD 9: full package for auth/payment/security, Cancer-zero required
- Even tiers (2, 4, 6, 8): open community variant slots

See [PD Workflow Tiers](./PD_TIERS.md).

## Production AI Review

Production adversarial review runs through OMO/OhMyOpenCode. OMO reads `orev` artifacts and selected source files, then runs GPT-5.5 Pro review through its subscription-backed runtime.

The direct `orev review --ai` provider path is experimental/self-hosted. It is not the production path.
