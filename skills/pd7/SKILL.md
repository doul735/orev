---
name: pd7
description: PD 7, 최고 출하 검증. save-context + SUX_review + tests/build/applicable E2E + architecture check + orev deterministic artifact gate + post-PR GitHub Codex merge gate.
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

### Step 4: 실행형 테스트 + 프로덕션 빌드 + applicable E2E

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

#### 4-4. E2E / equivalent executable proof
```bash
# UI/browser/auth/payment/data-security end-to-end surface exists:
pnpm test:e2e

# Otherwise run the strongest applicable proof beyond the unit test pass:
pnpm test:integration
# or: pnpm test:contract / API smoke / migration dry-run / CLI driver script
```

E2E는 사용자 여정, UI, browser-visible flow, auth/payment/data/security 경계가 실제 end-to-end surface를 갖는 경우 필수 실행한다. API, library, backend service처럼 E2E suite가 없는 프로젝트는 `pnpm test:e2e`를 실행하지 않고 Step 4-1의 unit test pass보다 강한 equivalent executable coverage를 선택해 실행하고 증거를 남긴다. 예: integration tests, contract tests, API smoke tests, migration dry-run, CLI/library driver script. 해당 변경에 맞는 stronger-than-unit-test coverage도 없으면 `[blocked] executable proof unavailable`로 중단하거나 사용자 승인 기반 예외를 명시한다.

### Step 5: 아키텍처 영향 점검

변경사항이 아키텍처에 미치는 영향을 분석한다:
- 레이어 위반 여부
- 순환 의존 발생 여부
- 기존 모듈 깊이(depth) 변화
- 변경으로 인한 새 seam 발생 여부
- auth/payment/data/security blast radius

영향이 크면 사용자에게 에스컬레이션.

### Step 6: orev 결정론적 artifact gate (커밋 전)

**반드시 커밋 전에 실행**. 커밋 후에는 diff가 비어서 리뷰 불가.
이 단계는 semantic approval가 아니다. semantic review는 Step 8의 post-PR GitHub Codex merge gate가 담당한다.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd7-review.XXXXXX)
orev review . --out "$TMP_DIR/pd7-review.md" --verbose
```

deterministic 결과만 확인한다. secret, privacy, context, report issue가 있으면 수정하고 executable proof/build/architecture/orev를 다시 실행한다.
orev 실패 시 중단하고 실패 원인을 보고한다. 직접 same-agent 분석은 참고 자료일 뿐, deterministic artifact gate를 대체하지 않는다.

### Step 7: Commit & PR

- `/commit` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.

### Step 8: Post-PR GitHub Codex Merge Gate

Mandatory merge gate for PD 7. This gate runs after PR creation and before merge.

- Setup and evidence requirements are documented in `docs/EXTERNAL_REVIEWERS.md`.
- Use the official GitHub Codex reviewer/plugin/connector on the PR. Claude Code self-review, SUX_review, Codex CLI preflight, another local model, architecture notes, and deterministic `orev review` are supporting evidence only; they do not replace this post-PR GitHub Codex gate.
- Claude Code self-review, direct same-agent analysis, Codex CLI preflight, and deterministic `orev review` output do not count as release approval.
- Confirm the latest PR head SHA and Codex-reviewed commit SHA. If the PR head changed after Codex review, rerun or retrigger Codex before merge.
- Fetch both PR reviews and inline review comments:

```bash
gh pr view <PR> --comments --reviews
gh api repos/<owner>/<repo>/pulls/<PR>/comments --paginate
```

- Classify every GitHub Codex inline comment as Cancer, Polyp, or Cigarette. Treat Codex P2 or higher as at least Polyp.
- PD 7 may merge only when open Codex Cancer and Polyp counts are 0, and all SUX/Codex Cancer counts are 0.
- If Codex reports Cancer or Polyp findings, fix them, push a new commit, rerun SUX_review, executable proof/build/architecture/orev checks as applicable, and rerun or retrigger this post-PR Codex gate against the updated PR head.
- If Codex reports Cigarette-only findings, fix them in the current pass. Any tracked-file Cigarette fix invalidates the prior SUX_review counts and deterministic `orev review` artifact, requiring fresh SUX_review evidence and a fresh clean orev artifact before the Codex gate is accepted.
- Codex review loops are bounded: run up to 3 review/fix cycles by default; if the first 3 cycles are Cigarette-only, stop after documenting cleanup attempts, remaining Cigarette risk, and zero open Cancer/Polyp; if cycle 3 reports any Polyp or Cancer, allow exactly 1 extra cycle after fixes; if cycle 4 still reports Polyp or Cancer, block release and require a human decision.
- Record found/fixed/open counts and the fixing commit SHA in the PR body or PR comment before merge.
- If GitHub Codex is unavailable, not installed, or cannot be inspected, stop with `[blocked] post-PR Codex review unavailable`. Do not downgrade to self-review.

### Verification

- [ ] save-context 완료 (시작)
- [ ] privacy gate ALLOW
- [ ] SUX_review 실행 + finding 전체 수정
- [ ] Cancer 0건 확인
- [ ] 테스트 전체 통과
- [ ] 빌드 성공
- [ ] applicable E2E 통과 또는 equivalent executable coverage 증거 기록
- [ ] 아키텍처 점검 완료
- [ ] orev 결정론적 gate 완료, clean artifact path 기록
- [ ] PR 생성됨
- [ ] /commit skill 또는 command invocation 증거
- [ ] post-PR GitHub Codex gate 실행 증거 (`gh pr view --comments --reviews`, `gh api repos/<owner>/<repo>/pulls/<PR>/comments --paginate`)
- [ ] Codex-reviewed commit SHA가 최신 PR head SHA와 일치하거나 gate 재실행 완료
- [ ] Codex Cancer 0 / open Polyp 0 확인, Codex-driven tracked-file fixes는 SUX_review/executable proof/build/architecture/orev/Codex 재검증 완료
- [ ] PR body/comment에 Codex found/fixed/open counts와 fixing commit SHA 기록

## 보고서

```
PD 7 완료!
1. 맥락 저장: MEMORY.md 업데이트 (시작)
2. Privacy Gate: ALLOW
3. SUX Review:
   - code-review: Cancer 0, Polyp N, Cigarette N → 현재 패스 수정
   - ux-review: Cancer 0, Polyp N, Cigarette N → 현재 패스 수정
   - Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
4. 테스트: N개 통과 (Ns)
5. 빌드: 통과
6. E2E / equivalent executable proof: [통과|해당 없음 + 대체 증거]
7. 아키텍처: [영향 없음|영향 보고됨]
8. orev 결정론적 gate: [클린 artifact path|issue 수정|에스컬레이션]
9. 커밋: /commit skill 또는 command invocation, <해시> <메시지>
10. PR: <URL>
11. Post-PR GitHub Codex gate: [reviewed head SHA, inline comment counts, found/fixed/open, fixing commits, result]
```

## 중단 조건

- Privacy Gate BLOCKED → 즉시 중단
- post-PR GitHub Codex gate 미실행/실패 → 중단
- Cancer 발견 후 수정 불가 → 중단 + 에스컬레이션
- Cancer 0건 미달 → 머지 차단
- 테스트/빌드/applicable E2E 또는 equivalent executable coverage 2회 실패 → 중단
