# Adapt This Workflow

You do not have to use `orev` exactly as shipped. The workflow is meant to be portable.

Use this repo in two ways:

1. Install the CLI and skills directly.
2. Ask your coding agent to study the repo and adapt the workflow to your own environment.

## Agent Prompt

```text
Read https://github.com/doul735/orev and adapt the PD workflow to our local AI coding environment.
Preserve these core ideas:
- privacy-gated context before review
- deterministic diff and context artifacts
- separate code review and UX review
- PD 1/3/5/7/9 release tiers
- Cigarette/Polyp/Cancer pathology classification
- evidence-before-completion verification

Do not copy anything blindly. Fit the workflow to our commands, tests, branch protection, and release process.
```

## What To Preserve

| Idea | Why it matters |
|---|---|
| Privacy gate | Secrets should be blocked before any AI review step |
| Diff/context artifacts | Review inputs should be deterministic and inspectable |
| Code + UX split | Correct code can still be incomplete product work |
| PD tiers | Small changes and critical changes deserve different gates |
| Pathology labels | Findings need spread-risk language, not just severity labels |
| Verification principle | Agents should not claim completion without fresh evidence |

## What To Customize

- Test commands: `npm test`, `pnpm test`, `pytest`, `go test`, or your own runner
- Build commands: `npm run build`, `pnpm build`, `cargo build`, or project-specific commands
- PR flow: GitHub, GitLab, internal review, or no remote
- Tier thresholds: file count, risk category, product area, compliance rules
- Review vocabulary: map Cigarette/Polyp/Cancer to your existing severity language if needed

## Suggested Mapping

```text
Your tiny docs/config changes       -> PD 1
Your normal feature or bug fix      -> PD 3
Your cross-file feature work        -> PD 5
Your release candidate or risky UX  -> PD 7
Your auth/payment/data/security     -> PD 9
```

## Do Not Preserve Blindly

- OMO integration is optional for external users.
- The exact skill names can change.
- The exact test/build commands should match your project.
- The pathology labels are memorable, but every finding still needs concrete evidence.

## Recommended Rollout

1. Start with `/pd3` for normal feature work.
2. Add `/pd7` for large changes.
3. Add `/pd9` only when you have critical flows that justify the extra gate.
4. Add design-time skills like `grill-me` separately before implementation, not inside PD release gates.
