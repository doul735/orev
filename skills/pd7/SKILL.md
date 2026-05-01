---
name: pd7
description: PD 7 — 대규모 변경 출하. save-context + SUX_review + 테스트 + 빌드 + E2E + orev 리뷰.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd7 — Release Proof

대규모 변경, 중요한 기능, 증명이 필요한 작업에 사용한다.

## 사용 시점

- 대규모 기능 구현
- 확신이 필요한 변경 (auth, 결제, 데이터)
- Cancer 발견으로 PD 3/5에서 에스컬레이션된 경우

## 구현 전 권장

PD 7은 구현 전에 `/grill-with-docs`로 도메인 모델 기반 설계 검증을 권장한다.

## 실행 절차

### Step 1: Save Context

`/save-context` 스킬을 실행한다.
- MEMORY.md에 현재 세션 맥락 저장
- 200줄 이내 유지 (Rolling Truncate)

### Step 2: Privacy Gate

```bash
orev privacy gate . --verbose
```

BLOCK 시 즉시 중단.

### Step 3: SUX Review (Pathology + 감염 확산)

`/SUX_review --fix` 스킬을 실행한다.
- code-review + ux-review 병렬 Agent 호출
- 모든 finding에 Cigarette/Polyp/Cancer 분류
- **감염 확산 분석**: 각 finding에 blast radius + infection path + containment 명시
- 전체 수정

### Step 4: 실행형 테스트 + 프로덕션 빌드 + E2E

#### 4-1. 실행형 테스트
```bash
pnpm test
```

#### 4-2. 타입 체크 (보조)
```bash
pnpm run check
```
타입 체크 실패는 경고만. 테스트 통과가 우선.

#### 4-3. 프로덕션 빌드
```bash
pnpm run build
```

#### 4-4. E2E (UI 변경 포함 시)
```bash
pnpm test:e2e
```
UI 변경 없으면 선택적.

### Step 5: orev 리뷰 (커밋 전)

**반드시 커밋 전에 실행** — 커밋 후에는 diff가 비어서 리뷰 불가.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd7-review.XXXXXX)
orev review . --out "$TMP_DIR/pd7-review.md" --verbose
```

- MUST-FIX/SHOULD-FIX → 수정 → Step 5 재실행 (최대 2회)
- 클린 → Step 6으로 진행

orev 실패 시 Claude Code 직접 분석 fallback.

### Step 6: Commit & PR

`/commit` 스킬을 실행한다.

### 안전장치

- 자동 수정 반복 제한: 최대 2회
- 빌드/테스트 실패 시 push 금지
- HIGH-risk 파일 (clerkAuth.ts, paymentService*, schema.ts): 자동 수정 금지, 사용자 에스컬레이션

### Verification

- [ ] save-context 완료
- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 수정
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] orev 리뷰 완료
- [ ] PR 생성됨

## 보고서

```
PD 7 완료!
1. 맥락 저장: MEMORY.md 업데이트
2. Privacy Gate: ALLOW
3. SUX Review:
   - code-review: Cigarette N, Polyp N, Cancer N → 수정
   - ux-review: Quick Win N, Major N → 수정
4. 테스트: N개 통과 (Ns)
5. 타입 체크: 통과
6. 빌드: 통과
7. 커밋: <해시> <메시지>
8. PR: <URL>
9. orev 리뷰: [클린|수정|에스컬레이션]
```

## 중단 조건

- Privacy Gate BLOCKED
- Cancer 발견 후 수정 불가
- 테스트 2회 실패
- 빌드 2회 실패
