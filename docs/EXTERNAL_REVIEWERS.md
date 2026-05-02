# External Reviewer Setup

PD 5 and PD 7 require an independent semantic reviewer. The deterministic `orev review` report is supporting evidence only; it does not approve a release.

## Default Supported Path: OpenAI Codex CLI

Install and authenticate the official Codex CLI outside the implementing agent runtime:

```bash
npm install -g @openai/codex
codex login
```

Run the review against the same immutable diff used for the PR. Resolve and record the base SHA first; do not rely on a moving branch ref for release evidence.

```bash
mkdir -p handoff
codex exec review --base <base-sha> --model gpt-5.4 --json \
  -o handoff/pd-review-<head-sha>.md \
  --title "PD external review for <base-sha>...<head-sha>" \
  > handoff/pd-review-<head-sha>.jsonl
```

Keep `handoff/` ignored or store these receipts as CI artifacts, PR comments, or hosted review URLs. Review receipts are durable release evidence, but they are not part of the reviewed source diff.

The receipt must include or preserve:

- reviewer runtime: OpenAI Codex CLI or another hosted reviewer runtime
- model name
- base and head SHA or another immutable diff range
- reviewed scope
- raw findings
- explicit pass/fail or no-findings result
- durable artifact path, PR comment, CI artifact, or hosted review URL

If Codex or another external runtime is unavailable, PD 5 and PD 7 stop with `[blocked] cross-model review unavailable`. Do not downgrade to self-review.

## Other Runtimes

Organizations may replace Codex with another hosted reviewer. It must run outside the implementing agent's self-review loop and leave the same receipt evidence.
