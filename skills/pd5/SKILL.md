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
- Cancer 발견 → PD 7 에스컬레이션 권고
- Cigarette 발견은 현재 패스에서 수정하고, 보고서에 cycle evidence, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation을 남긴다.

### Step 3: Independent Reviewer Gate

Mandatory release gate. The implementing agent must not be the final semantic reviewer.

- Run semantic review with an independent reviewer model or hosted review runtime.
- Use privacy-gated `orev` artifacts and selected source context as input.
- Local self-review, direct same-agent analysis, and deterministic `orev review` output are supporting evidence only; they do not count as release approval.
- If the independent reviewer is unavailable or fails, stop with `[blocked] cross-model review unavailable`.
- Report reviewer identity, invocation evidence, reviewed artifacts, and Cancer/Polyp/Cigarette counts.

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

orev 실패 시 Claude Code 직접 분석 fallback.

### Step 7: Commit & PR

- `/commit` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.

### 디버깅

테스트 실패 시 `/diagnose`를 활용하여 체계적으로 디버깅한다.

### Verification

- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 수정
- [ ] independent reviewer gate 통과, self-review가 approval로 계산되지 않았다는 증거
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
   - code-review: Cancer N, Polyp N, Cigarette N → 현재 패스 수정
   - ux-review: Cancer N, Polyp N, Cigarette N → 현재 패스 수정
   - Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
3. Independent reviewer gate: [reviewer/runtime, invocation evidence, result]
4. 테스트: N개 통과 (Ns)
5. 빌드: 통과
6. orev 결정론적 gate: [클린|issue 수정|에스컬레이션]
7. 커밋: /commit skill 또는 command invocation, <해시> <메시지>
8. PR: <URL>
```
