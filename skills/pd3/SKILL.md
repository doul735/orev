---
name: pd3
description: PD 3, 일반 기능/버그 수정 출하. code-review + 타입 체크 + 커밋/PR + orev 결정론적 artifact gate.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd3: Standard Review

일반적인 기능 구현이나 버그 수정에 사용한다.

## 사용 시점

- 복잡도가 낮~중간인 기능 구현
- 로컬라이즈된 버그 수정
- 3~10파일 변경

## 실행 절차

이 섹션에서 호출하는 nested workflow는 runtime의 공식 skill/command invocation mechanism으로 실행해야 한다. 그래야 해당 SKILL.md가 로드된다.

### Step 1: Privacy Gate

```bash
orev privacy gate . --verbose
```

BLOCK 시 즉시 중단.

### Step 2: Code Review (Pathology 분류)

- `/code-review --fix` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.
- 모든 finding에 Cigarette/Polyp/Cancer 분류 적용
- legacy: MUST-FIX / SHOULD-FIX / NIT 메타데이터는 보조 정보로만 남긴다.
- Cancer 발견 → PD 7 에스컬레이션 권고
- Cigarette 발견은 현재 패스에서 수정하고, 보고서에 cycle evidence, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation을 남긴다.

### Step 3: 타입 체크

```bash
pnpm run check
```

실패 시 수정 → 재실행 (최대 2회).

### Step 4: orev 결정론적 artifact gate (커밋 전)

orev artifact를 생성하고 정적 결과를 확인한다. **반드시 커밋 전에 실행**. 커밋 후에는 diff가 비어서 다시 볼 근거가 없다.
이 단계는 semantic approval가 아니다. semantic review는 `/code-review`, `/ux-review`, `/SUX_review`, 또는 선택된 hosted review runtime이 담당한다. 이 nested workflow들도 공식 skill/command invocation mechanism으로 호출해야 SKILL.md가 로드된다.

```bash
TMP_DIR=$(mktemp -d /tmp/orev-pd3-review.XXXXXX)
orev review . --out "$TMP_DIR/pd3-review.md" --verbose
```

보고서를 Read로 읽고 secret, privacy, context, report issue만 확인한다.
- deterministic issue 발견 → 수정 → Step 4 재실행 (최대 2회)
- issue 없음 → Step 5로 진행

orev 실패 시 Claude Code 직접 분석 fallback.

### Step 5: Commit & PR

- `/commit` 스킬을 runtime의 공식 skill/command invocation mechanism으로 실행한다.

### Verification

각 Step 완료 시 증거 확인:
- [ ] privacy gate ALLOW
- [ ] code-review 실행 + finding 수정 완료
- [ ] tsc 통과
- [ ] orev 결정론적 gate 완료
- [ ] /commit skill 또는 command invocation 증거
- [ ] PR 생성됨

## 보고서

```
PD 3 완료!
1. Privacy Gate: ALLOW
2. Code Review: Cancer N건, Polyp N건, Cigarette N건 → 현재 패스 수정 완료
   - Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
3. 타입 체크: 통과
4. orev 결정론적 gate: [클린|issue 수정 완료|에스컬레이션]
5. 커밋: /commit skill 또는 command invocation, <해시> <메시지>
6. PR: <URL>
```
