---
name: pd7
description: PD 7, 최고 출하 검증. save-context + SUX_review + independent reviewer gate + tests/build/applicable E2E + architecture check + orev deterministic artifact gate.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd7: Release Proof

대규모 변경, Cancer-class 변경, 인증/인가, 결제/빌링, 데이터 마이그레이션, 암호화, 시크릿 관리, 프로덕션 인프라 변경에 사용하는 최고 검증 등급이다.

## 사용 시점

- 대규모 기능 구현
- 인증/인가/권한 변경
- 결제/빌링/금액 관련 변경
- 데이터 마이그레이션, 스키마 대규모 변경
- 암호화, 시크릿 관리, 프로덕션 인프라 변경
- Cancer 발견으로 PD 3/5에서 에스컬레이션된 경우
- 실행 동작을 추론이 아니라 증명해야 하는 경우

## 구현 전 권장

PD 7은 구현 전에 `/grill-with-docs`로 도메인 모델 기반 설계 검증을 권장한다.

## 실행 절차

이 섹션에서 호출하는 nested workflow는 runtime의 공식 skill/command invocation mechanism으로 실행해야 한다. 그래야 해당 SKILL.md가 로드된다.

### Step 1: Save Context

- `/save-context` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.
- MEMORY.md에 현재 세션 맥락 저장
- 200줄 이내 유지 (Rolling Truncate)

### Step 2: Privacy Gate

```bash
orev privacy gate . --verbose
```

BLOCK 시 즉시 중단.

### Step 3: SUX Review (Full Pathology + Infection Spread)

`/SUX_review --fix` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.
- code-review + ux-review 병렬 nested skill 호출
- 실행 증거를 남긴다. invocation method, changed-files basis, `--fix` 적용 여부를 기록한다.
- Cigarette/Polyp/Cancer 분류 + blast radius / infection path / containment 분석
- legacy: MUST-FIX / SHOULD-FIX / NIT, Quick Win / Major / Nice-to-have 메타데이터는 보조 정보로만 남긴다.
- 전체 수정
- Cancer 0건 필수. Cancer가 남으면 머지 차단.
- Cigarette 발견은 현재 패스에서 수정하고, 보고서에 cycle evidence, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation을 남긴다.

### Step 4: Independent Reviewer Gate

Mandatory release gate. The implementing agent must not be the final semantic reviewer.

- Run semantic review with an independent reviewer model or hosted review runtime.
- Default supported setup path: `docs/EXTERNAL_REVIEWERS.md`, using `codex exec review --base <base> --model <model> --json -o <receipt.md>` or an equivalent hosted reviewer receipt.
- Use privacy-gated `orev` artifacts and selected source context as input.
- Local self-review, direct same-agent analysis, and deterministic `orev review` output are supporting evidence only; they do not count as release approval.
- If the independent reviewer is unavailable or fails, stop with `[blocked] cross-model review unavailable`.
- Report reviewer identity, invocation evidence, reviewed artifacts, and Cancer/Polyp/Cigarette counts.
- If the independent reviewer reports Cancer or Polyp findings, stop before executable proof, commit, or PR, fix the findings, and rerun the independent reviewer gate. PD 7 may proceed only when independent reviewer Cancer and Polyp counts are 0.
- If the independent reviewer reports Cigarette-only findings, fix them in the current pass and record cycle evidence before proceeding.

### Step 5: 실행형 테스트 + 프로덕션 빌드 + applicable E2E

#### 5-1. 실행형 테스트
```bash
pnpm test
```

#### 5-2. 타입 체크 (보조)
```bash
pnpm run check
```

타입 체크 실패는 경고만. 테스트 통과가 우선.

#### 5-3. 프로덕션 빌드
```bash
pnpm run build
```

#### 5-4. E2E / equivalent executable proof
```bash
pnpm test:e2e
```

E2E는 사용자 여정, UI, browser-visible flow, auth/payment/data/security 경계가 실제 end-to-end surface를 갖는 경우 필수 실행한다. API, library, backend service처럼 E2E suite가 없는 프로젝트는 `[blocked] E2E unavailable`로 멈추는 대신 equivalent executable coverage를 실행하고 증거를 남긴다. 예: integration tests, contract tests, API smoke tests, migration dry-run, CLI/library driver script. 해당 변경에 맞는 equivalent coverage도 없으면 `[blocked] executable proof unavailable`로 중단하거나 사용자 승인 기반 예외를 명시한다.

### Step 6: 아키텍처 영향 점검

변경사항이 아키텍처에 미치는 영향을 분석한다:
- 레이어 위반 여부
- 순환 의존 발생 여부
- 기존 모듈 깊이(depth) 변화
- 변경으로 인한 새 seam 발생 여부
- auth/payment/data/security blast radius

영향이 크면 사용자에게 에스컬레이션.

### Step 7: orev 결정론적 artifact gate (커밋 전)

**반드시 커밋 전에 실행**. 커밋 후에는 diff가 비어서 리뷰 불가.
이 단계는 semantic approval가 아니다. semantic review는 Step 4의 independent reviewer gate가 담당한다.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd7-review.XXXXXX)
orev review . --out "$TMP_DIR/pd7-review.md" --verbose
```

deterministic 결과만 확인한다. secret, privacy, context, report issue가 있으면 수정하고 다시 실행한다.
orev 실패 시 중단하고 실패 원인을 보고한다. 직접 same-agent 분석은 참고 자료일 뿐, deterministic artifact gate를 대체하지 않는다.

### Step 8: Commit & PR

- `/commit` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.

### Step 9: Save Context (최종)

- `/save-context`를 runtime의 공식 skill/command invocation mechanism으로 최종 상태 저장한다.

### Verification

- [ ] save-context 완료 (시작)
- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 전체 수정
- [ ] independent reviewer gate 통과, self-review가 approval로 계산되지 않았다는 증거
- [ ] independent reviewer Cancer 0 / Polyp 0 확인, Cigarette-only findings는 현재 패스 수정 완료
- [ ] Cancer 0건 확인
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] applicable E2E 통과 또는 equivalent executable coverage 증거 기록
- [ ] 아키텍처 점검 완료
- [ ] orev 결정론적 gate 완료
- [ ] PR 생성됨
- [ ] /commit skill 또는 command invocation 증거
- [ ] 최종 save-context 완료

## 보고서

```
PD 7 완료!
1. 맥락 저장: MEMORY.md 업데이트 (시작+종료)
2. Privacy Gate: ALLOW
3. SUX Review:
   - code-review: Cancer 0, Polyp N, Cigarette N → 현재 패스 수정
   - ux-review: Cancer 0, Polyp N, Cigarette N → 현재 패스 수정
   - Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
4. Independent reviewer gate: [reviewer/runtime, invocation evidence, result]
5. 테스트: N개 통과 (Ns)
6. 빌드: 통과
7. E2E / equivalent executable proof: [통과|해당 없음 + 대체 증거]
8. 아키텍처: [영향 없음|영향 보고됨]
9. orev 결정론적 gate: 클린 확인 → 머지 가능
10. 커밋: /commit skill 또는 command invocation, <해시> <메시지>
11. PR: <URL>
```

## 중단 조건

- Privacy Gate BLOCKED → 즉시 중단
- independent reviewer gate 미실행/실패 → 중단
- Cancer 발견 후 수정 불가 → 중단 + 에스컬레이션
- Cancer 0건 미달 → 머지 차단
- 테스트/빌드/applicable E2E 또는 equivalent executable coverage 2회 실패 → 중단
