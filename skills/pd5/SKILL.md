---
name: pd5
description: PD 5 — 중규모 변경 출하. SUX_review + 실행형 테스트 + 빌드 + orev 리뷰.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd5 — Ship Candidate

중규모 변경, 원샷 구현이 확실하지 않은 작업에 사용한다.

## 사용 시점

- 중규모 기능 구현 (10+ 파일)
- 리팩토링
- API/스키마 변경 포함
- "이거 한번에 될까?" 감이 안 올 때

## 구현 전 권장

PD 5 이상은 구현 전에 `/grill-me`로 설계를 검증하는 것을 권장한다. 강제는 아님.

## 실행 절차

### Step 1: Privacy Gate

```bash
orev privacy gate . --verbose
```

### Step 2: SUX Review (Code + UX 병렬)

`/SUX_review --fix` 스킬을 실행한다.
- code-review + ux-review 병렬 Agent 호출
- 모든 finding에 Cigarette/Polyp/Cancer 분류
- MUST-FIX + SHOULD-FIX + Quick Win 전부 수정

### Step 3: 실행형 테스트

프로젝트 스택에 따라 자동 감지:
- `pnpm test` / `pytest` / `vitest` 등
- 타임아웃 5분
- 실패 시 수정 → 재실행 (최대 2회)

### Step 4: 빌드

```bash
pnpm run build
```

### Step 5: orev 리뷰 (커밋 전)

**반드시 커밋 전에 실행** — 커밋 후에는 diff가 비어서 리뷰 불가.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd5-review.XXXXXX)
orev review . --out "$TMP_DIR/pd5-review.md" --verbose
```

orev 실패 시 Claude Code 직접 분석 fallback.

### Step 6: Commit & PR

`/commit` 스킬을 실행한다.

### 디버깅

테스트 실패 시 `/diagnose`를 활용하여 체계적으로 디버깅한다.

### Verification

- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 수정
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] orev 리뷰 완료
- [ ] PR 생성됨

## 보고서

```
PD 5 완료!
1. Privacy Gate: ALLOW
2. SUX Review:
   - code-review: Cigarette N, Polyp N → 수정
   - ux-review: Quick Win N, Major N → 수정
3. 테스트: N개 통과 (Ns)
4. 빌드: 통과
5. 커밋: <해시> <메시지>
6. PR: <URL>
7. orev 리뷰: [클린|수정|에스컬레이션]
```
