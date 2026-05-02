---
name: pd5
description: PD 5, 중규모 변경 출하. SUX_review + 실행형 테스트 + 빌드 + orev 결정론적 artifact gate + post-PR GitHub Codex merge gate.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd5: Ship Candidate

중규모 변경, 원샷 구현이 확실하지 않은 작업에 사용한다.

## 사용 시점

- 중규모 기능 구현 (10+ 파일)
- 리팩토링
- API/스키마 변경 포함
- "이거 한번에 될까?" 감이 안 올 때

## 구현 전 권장

PD 5 이상은 구현 전에 `/grill-me`로 설계를 검증하는 것을 권장한다. 강제는 아님.

## 실행 절차

이 섹션에서 호출하는 nested workflow는 runtime의 공식 skill/command invocation mechanism으로 실행해야 한다. 그래야 해당 SKILL.md가 로드된다.

### Step 1: Privacy Gate

```bash
orev privacy gate . --verbose
```

### Step 2: SUX Review (Code + UX 병렬)

`/SUX_review --fix` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.
- code-review + ux-review 병렬 nested skill 호출
- 실행 증거를 남긴다. invocation method, changed-files basis, `--fix` 적용 여부를 기록한다.
- 모든 finding에 Cigarette/Polyp/Cancer 분류
- legacy: MUST-FIX / SHOULD-FIX / NIT, Quick Win / Major / Nice-to-have 메타데이터는 보조 정보로만 남긴다.
- Cancer 발견 → 즉시 중단. PD 7로 mandatory escalation을 기록하고, PD 5 테스트/빌드/커밋/PR 단계로 진행하지 않는다. Cancer-class issue를 수정한 뒤에도 PD 5로 재개하지 말고 PD 7에서 재검증한다.
- Polyp 발견 → 현재 패스에서 수정하고, Polyp 0건이 될 때까지 tests, build, commit, PR, post-PR GitHub Codex 단계로 진행하지 않는다.
- Cigarette 발견은 현재 패스에서 수정하고, 보고서에 cycle evidence, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation을 남긴다.

### Step 3: 실행형 테스트

프로젝트 스택에 따라 자동 감지:
- `pnpm test` / `pytest` / `vitest` 등
- 타임아웃 5분
- 실패 시 수정 → 재실행 (최대 2회)

### Step 4: 빌드

```bash
pnpm run build
```

### Step 5: orev 결정론적 artifact gate (커밋 전)

**반드시 커밋 전에 실행**. 커밋 후에는 diff가 비어서 리뷰 불가.
이 단계는 semantic approval가 아니다. semantic review는 Step 7의 post-PR GitHub Codex merge gate가 담당한다.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd5-review.XXXXXX)
orev review . --out "$TMP_DIR/pd5-review.md" --verbose
```

deterministic 결과만 본다. secret, privacy, context, report issue가 있으면 수정하고 테스트/빌드/orev를 다시 실행한다.

orev 실패 시 중단하고 실패 원인을 보고한다. 직접 same-agent 분석은 참고 자료일 뿐, deterministic artifact gate를 대체하지 않는다.

### Step 6: Commit & PR

- `/commit` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.

### Step 7: Post-PR GitHub Codex Merge Gate

Mandatory merge gate for PD 5. This gate runs after PR creation and before merge.

- Setup and evidence requirements are documented in `docs/EXTERNAL_REVIEWERS.md`.
- Use the official GitHub Codex reviewer/plugin/connector on the PR. Claude Code self-review, SUX_review, Codex CLI preflight, another local model, and deterministic `orev review` are supporting evidence only; they do not replace this post-PR GitHub Codex gate.
- Claude Code self-review, direct same-agent analysis, Codex CLI preflight, and deterministic `orev review` output do not count as release approval.
- Confirm the latest PR head SHA and Codex-reviewed commit SHA. If the PR head changed after Codex review, rerun or retrigger Codex before merge.
- Fetch both PR reviews and inline review comments:

```bash
gh pr view <PR> --comments --reviews
gh api repos/<owner>/<repo>/pulls/<PR>/comments
```

- Classify every GitHub Codex inline comment as Cancer, Polyp, or Cigarette. Treat Codex P2 or higher as at least Polyp.
- If Codex reports any Cancer finding, stop PD 5 and mandatory-escalate to PD 7. Do not continue under PD 5 after fixing a Cancer-class issue.
- If Codex reports Polyp findings, fix them, push a new commit, rerun SUX_review, tests/build/orev as applicable, and rerun or retrigger this post-PR Codex gate. PD 5 may merge only when open Codex Cancer and Polyp counts are 0.
- If Codex reports Cigarette-only findings, fix them in the current pass when practical. Any tracked-file Cigarette fix invalidates the prior SUX_review counts and deterministic `orev review` artifact, requiring fresh SUX_review evidence and a fresh clean orev artifact before the Codex gate is accepted. After 3 consecutive Cigarette-only cycles with documented cleanup evidence and zero Cancer/Polyp, stop the loop and report remaining Cigarette risk instead of blocking release indefinitely.
- Record found/fixed/open counts and the fixing commit SHA in the PR body or PR comment before merge.
- If GitHub Codex is unavailable, not installed, or cannot be inspected, stop with `[blocked] post-PR Codex review unavailable`. Do not downgrade to self-review.

### 디버깅

테스트 실패 시 `/diagnose`를 활용하여 체계적으로 디버깅한다.

### Verification

- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 수정
- [ ] Cancer 0건 확인 또는 PD 7 mandatory escalation으로 중단
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] orev 결정론적 gate 완료, clean artifact path 기록
- [ ] /commit skill 또는 command invocation 증거
- [ ] PR 생성됨
- [ ] post-PR GitHub Codex gate 실행 증거 (`gh pr view --comments --reviews`, `gh api repos/<owner>/<repo>/pulls/<PR>/comments`)
- [ ] Codex-reviewed commit SHA가 최신 PR head SHA와 일치하거나 gate 재실행 완료
- [ ] Codex Cancer 0 / open Polyp 0 확인, Codex-driven tracked-file fixes는 SUX_review/tests/build/orev/Codex 재검증 완료
- [ ] PR body/comment에 Codex found/fixed/open counts와 fixing commit SHA 기록

## 보고서

```
PD 5 완료!
1. Privacy Gate: ALLOW
2. SUX Review:
   - code-review: Cancer 0, Polyp N, Cigarette N → Polyp/Cigarette 현재 패스 수정
   - ux-review: Cancer 0, Polyp N, Cigarette N → Polyp/Cigarette 현재 패스 수정
   - Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
3. 테스트: N개 통과 (Ns)
4. 빌드: 통과
5. orev 결정론적 gate: [클린 artifact path|issue 수정|에스컬레이션]
6. 커밋: /commit skill 또는 command invocation, <해시> <메시지>
7. PR: <URL>
8. Post-PR GitHub Codex gate: [reviewed head SHA, inline comment counts, found/fixed/open, fixing commits, result]
```
