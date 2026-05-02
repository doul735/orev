# GOTCHAS

Operational mistakes that caused repeated PD workflow failures. Keep this file terse and promote stable lessons into the skills when they repeat.

## PD5 Cancer Is A Hard Stop

- Any Cancer finding in PD 5 stops PD 5 immediately.
- Fixing the Cancer finding does not allow PD 5 to resume.
- Record mandatory escalation and restart the release path under PD 7.
- Do not continue to tests, build, orev, commit, PR, or merge under PD 5 after a Cancer-class issue.

## Polyp Is Not Cigarette

- The 3-cycle stop rule applies only to Cigarette-only cycles.
- Any open Polyp blocks release.
- Do not downgrade Polyp to Cigarette because it appears to have no immediate functional effect.
- Reports must use found/fixed/open counts, not only final optimistic counts.

## Post-PR Codex Gate Scope

- The post-PR GitHub Codex merge gate is mandatory for PD 5 and PD 7 only.
- PD 3 does not require Codex by default.
- PD 3 still must handle Codex comments if the PR explicitly requested Codex or Codex already commented.

## PD5/PD7 GitHub Codex Merge Gate

- After PR creation and before merge, inspect official GitHub Codex reviewer/plugin output.
- Run both:
  - `gh pr view <PR> --comments --json reviews,comments,headRefOid,mergeable,state,url`
  - `gh api repos/<owner>/<repo>/pulls/<PR>/comments --paginate`
- Classify every Codex inline comment as Cancer, Polyp, or Cigarette.
- Treat Codex P2 or higher as at least Polyp.
- Open Polyp or Cancer blocks merge.
- Fixes require a new commit, fresh applicable verification, and found/fixed/open counts in the PR body or comment.
- Claude Code self-review, SUX_review, Codex CLI preflight, and deterministic `orev review` do not replace this post-PR GitHub Codex gate.

## Codex Review Loop Limit

- Default maximum: 3 Codex review cycles.
- A cycle is Codex review → classify findings → fix required findings → rerun required verification → push or retrigger Codex.
- If the first 3 cycles are Cigarette-only, stop after documenting cleanup attempts, remaining Cigarette risk, and zero open Cancer/Polyp.
- If cycle 3 reports any Polyp or Cancer, allow exactly 1 extra cycle after fixes.
- If cycle 4 still reports Polyp or Cancer, block release and require a human decision.
- Open Cancer or Polyp is never mergeable.

## Secret Or Credential Accidents

- Secrets exposed in filenames, directory names, logs, or shell output count as privacy incidents.
- Delete the artifact, then prove absence with `rg` and `git status`.
- Keep `handoff/` and transient receipts out of source commits unless explicitly intended.
- Rotate the credential if it may have been exposed outside local ephemeral context.
