# External Reviewer Setup

PD 5 and PD 7 require an independent semantic reviewer. The deterministic `orev review` report is supporting evidence only; it does not approve a release.

## Default Supported Path: OpenAI Codex CLI

Install and authenticate the official Codex CLI outside the implementing agent runtime:

```bash
npm install -g @openai/codex
codex login
```

Run the review against the same final diff used for the PR. Resolve and record the base SHA first; do not rely on a moving branch ref for release evidence. For the normal PD 5/7 pre-commit gate, include uncommitted tracked changes in the reviewed scope.

```bash
mkdir -p handoff
PATCH_ID=$(git diff --binary | shasum -a 256 | cut -d ' ' -f 1)
codex exec review --base <base-sha> --uncommitted --model gpt-5.4 --json \
  -o handoff/pd-review-${PATCH_ID}.md \
  --title "PD external review for <base-sha> + uncommitted patch ${PATCH_ID}" \
  > handoff/pd-review-${PATCH_ID}.jsonl
```

Keep `handoff/` ignored or store these receipts as CI artifacts, PR comments, or hosted review URLs. Review receipts are durable release evidence, but they are not part of the reviewed source diff.

If the final diff is already committed, use the immutable head SHA in the title and verify the receipt covers `<base-sha>...<head-sha>`. If the final diff is still pre-commit, keep `--uncommitted` and record the patch hash or patch artifact that was reviewed.

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
