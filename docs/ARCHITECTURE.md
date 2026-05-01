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

## Production AI Review

Production adversarial review runs through OMO/OhMyOpenCode. OMO reads `orev` artifacts and selected source files, then runs GPT-5.5 Pro review through its subscription-backed runtime.

The direct `orev review --ai` provider path is experimental/self-hosted. It is not the production path.
