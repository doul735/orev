---
name: pd3
description: PD 3 — 일반 기능/버그 수정 출하. code-review + 타입 체크 + 커밋/PR + orev 리뷰.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd3 — Standard Review

일반적인 기능 구현이나 버그 수정에 사용한다.

## 사용 시점

- 복잡도가 낮~중간인 기능 구현
- 로컬라이즈된 버그 수정
- 3~10파일 변경

## 실행 절차

### Step 1: Privacy Gate

```bash
node orev privacy gate . --verbose
```

BLOCK 시 즉시 중단.

### Step 2: Code Review (Pathology 분류)

`/code-review --fix` 스킬을 실행한다.
- 모든 finding에 Cigarette/Polyp/Cancer 분류 적용
- MUST-FIX + SHOULD-FIX 수정
- Cancer 발견 → PD 7 에스컬레이션 권고

### Step 3: 타입 체크

```bash
pnpm run check
```

실패 시 수정 → 재실행 (최대 2회).

### Step 4: Commit & PR

`/commit` 스킬을 실행한다.

### Step 5: orev 리뷰 (OMO)

orev artifact를 생성하고 OMO에서 적대적 리뷰를 수행한다.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd3-review.XXXXXX)
node orev review . --out "$TMP_DIR/pd3-review.md" --verbose
```

보고서를 Read로 읽고 findings를 확인한다.
- MUST-FIX/SHOULD-FIX → 수정 → push → 재리뷰 (최대 2회)
- NIT만 또는 클린 → 머지 진행

orev 실패 시 Claude Code 직접 분석 fallback.

### Verification

각 Step 완료 시 증거 확인:
- [ ] privacy gate ALLOW
- [ ] code-review 실행 + finding 수정 완료
- [ ] tsc 통과
- [ ] PR 생성됨
- [ ] orev 리뷰 완료

## 보고서

```
PD 3 완료!
1. Privacy Gate: ALLOW
2. Code Review: Cigarette N건, Polyp N건 → 수정 완료
3. 타입 체크: 통과
4. 커밋: <해시> <메시지>
5. PR: <URL>
6. orev 리뷰: [클린|수정 완료|에스컬레이션]
```
