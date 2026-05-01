---
name: pd5
description: PD 5, 중규모 변경 출하. SUX_review + independent reviewer gate + 실행형 테스트 + 빌드 + orev 결정론적 artifact gate.
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
- Cancer 발견 → 즉시 중단. PD 7로 mandatory escalation을 기록하고, Cancer가 0건이 될 때까지 테스트/빌드/커밋/PR 단계로 진행하지 않는다.
- Polyp 발견 → 현재 패스에서 수정하고, Polyp 0건이 될 때까지 independent reviewer, tests, build, commit, PR 단계로 진행하지 않는다.
- Cigarette 발견은 현재 패스에서 수정하고, 보고서에 cycle evidence, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation을 남긴다.

### Step 3: Independent Reviewer Gate

Mandatory release gate. The implementing agent must not be the final semantic reviewer.

- Run semantic review with an independent reviewer model or hosted review runtime.
- Default supported setup path: `docs/EXTERNAL_REVIEWERS.md`, using `codex exec review --base <base> --model <model> --json -o <receipt.md>` or an equivalent hosted reviewer receipt.
- Use privacy-gated `orev` artifacts and selected source context as input.
- Local self-review, direct same-agent analysis, and deterministic `orev review` output are supporting evidence only; they do not count as release approval.
- If the independent reviewer is unavailable or fails, stop with `[blocked] cross-model review unavailable`.
- Report reviewer identity, invocation evidence, reviewed artifacts, and Cancer/Polyp/Cigarette counts.
- If the independent reviewer reports any Cancer finding, stop PD 5 and mandatory-escalate to PD 7. Do not continue under PD 5 after fixing a Cancer-class issue.
- If the independent reviewer reports Polyp findings, stop before tests, build, commit, or PR, fix the findings, and rerun the independent reviewer gate. PD 5 may proceed only when independent reviewer Cancer and Polyp counts are 0.
- If the independent reviewer reports Cigarette-only findings, fix them in the current pass and record cycle evidence before proceeding.

### Step 4: 실행형 테스트

프로젝트 스택에 따라 자동 감지:
- `pnpm test` / `pytest` / `vitest` 등
- 타임아웃 5분
- 실패 시 수정 → 재실행 (최대 2회)

### Step 5: 빌드

```bash
pnpm run build
```

### Step 6: orev 결정론적 artifact gate (커밋 전)

**반드시 커밋 전에 실행**. 커밋 후에는 diff가 비어서 리뷰 불가.
이 단계는 semantic approval가 아니다. semantic review는 `/code-review`, `/ux-review`, `/SUX_review`, 또는 선택된 hosted review runtime이 담당한다. 이 nested workflow들도 공식 skill/command invocation mechanism으로 호출해야 SKILL.md가 로드된다.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd5-review.XXXXXX)
orev review . --out "$TMP_DIR/pd5-review.md" --verbose
```

deterministic 결과만 본다. secret, privacy, context, report issue가 있으면 수정하고 다시 실행한다.

orev 실패 시 중단하고 실패 원인을 보고한다. 직접 same-agent 분석은 참고 자료일 뿐, deterministic artifact gate를 대체하지 않는다.

### Step 7: Commit & PR

- `/commit` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.

### 디버깅

테스트 실패 시 `/diagnose`를 활용하여 체계적으로 디버깅한다.

### Verification

- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 수정
- [ ] Cancer 0건 확인 또는 PD 7 mandatory escalation으로 중단
- [ ] independent reviewer gate 통과, self-review가 approval로 계산되지 않았다는 증거
- [ ] independent reviewer Cancer 0 / Polyp 0 확인, Cigarette-only findings는 현재 패스 수정 완료
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] orev 결정론적 gate 완료
- [ ] /commit skill 또는 command invocation 증거
- [ ] PR 생성됨

## 보고서

```
PD 5 완료!
1. Privacy Gate: ALLOW
2. SUX Review:
   - code-review: Cancer 0, Polyp N, Cigarette N → Polyp/Cigarette 현재 패스 수정
   - ux-review: Cancer 0, Polyp N, Cigarette N → Polyp/Cigarette 현재 패스 수정
   - Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
3. Independent reviewer gate: [reviewer/runtime, invocation evidence, result]
4. 테스트: N개 통과 (Ns)
5. 빌드: 통과
6. orev 결정론적 gate: [클린|issue 수정|에스컬레이션]
7. 커밋: /commit skill 또는 command invocation, <해시> <메시지>
8. PR: <URL>
```
