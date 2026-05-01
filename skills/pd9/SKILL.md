---
name: pd9
description: PD 9 — 풀패키지 출하. 보안/결제/인증 변경용. Cancer 0건 필수.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd9 — Full Package

가장 높은 검증 등급. 보안, 결제, 인증, 데이터 마이그레이션 등 치명적 변경에 사용한다.

## 사용 시점

- 인증/인가 로직 변경
- 결제/빌링/금액 관련 변경
- 데이터 마이그레이션, 스키마 대규모 변경
- 암호화, 시크릿 관리 변경
- 프로덕션 인프라 변경

## 구현 전 필수

PD 9는 `/grill-with-docs`로 도메인 모델 기반 설계 검증을 **강력히 권장**한다.

## PD 7과의 차이

| | PD 7 | PD 9 |
|---|---|---|
| 아키텍처 점검 | 없음 | improve-architecture |
| Cancer 허용 | 수정 후 머지 가능 | **Cancer 0건이어야 머지** |
| save-context | Step 1 | Step 1 + Step 마지막 |

## 실행 절차

### Step 1: Save Context

`/save-context` 스킬을 실행한다.

### Step 2: Privacy Gate

```bash
orev privacy gate . --verbose
```

BLOCK 시 즉시 중단.

### Step 3: SUX Review (풀 Pathology)

`/SUX_review --fix` 스킬을 실행한다.
- code-review + ux-review 병렬
- Cigarette/Polyp/Cancer 분류 + 감염 확산 분석
- 전체 수정

### Step 4: 실행형 테스트 + 빌드 + E2E

PD 7 Step 4와 동일. E2E는 UI 변경 유무와 무관하게 **필수 실행**.

### Step 5: 아키텍처 영향 점검

변경사항이 아키텍처에 미치는 영향을 분석한다:
- 레이어 위반 여부
- 순환 의존 발생 여부
- 기존 모듈 깊이(depth) 변화
- 변경으로 인한 새 seam 발생 여부

영향이 크면 사용자에게 에스컬레이션.

### Step 6: orev 리뷰 (커밋 전)

**반드시 커밋 전에 실행** — 커밋 후에는 diff가 비어서 리뷰 불가.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd9-review.XXXXXX)
orev review . --out "$TMP_DIR/pd9-review.md" --verbose
```

**Cancer 0건 확인 필수.** Cancer 잔존 시 Step 7 진행 불가.

### Step 7: Commit & PR

`/commit` 스킬을 실행한다.

### Step 8: Save Context (최종)

`/save-context`로 최종 상태 저장.

### Verification

- [ ] save-context 완료 (시작 + 종료)
- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 전체 수정
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] E2E 통과
- [ ] 아키텍처 점검 완료
- [ ] orev 리뷰 Cancer 0건
- [ ] PR 생성됨
- [ ] 최종 save-context 완료

## 보고서

```
PD 9 완료!
1. 맥락 저장: MEMORY.md 업데이트 (시작+종료)
2. Privacy Gate: ALLOW
3. SUX Review:
   - code-review: Cigarette N, Polyp N, Cancer 0 → 전체 수정
   - ux-review: Quick Win N, Major N → 전체 수정
4. 테스트: N개 통과 (Ns)
5. 빌드: 통과
6. E2E: 통과
7. 아키텍처: [영향 없음|영향 보고됨]
8. 커밋: <해시> <메시지>
9. PR: <URL>
10. orev 리뷰: Cancer 0건 확인 → 머지 가능
```

## 중단 조건

- Privacy Gate BLOCKED → 즉시 중단
- Cancer 발견 후 수정 불가 → 중단 + 에스컬레이션
- Cancer 0건 미달 → 머지 차단
- 테스트/빌드/E2E 2회 실패 → 중단
