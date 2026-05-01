---
name: pd1
description: PD 1 — 원라이너/문서/설정 수정용 경량 출하. privacy gate + 커밋/PR.
user-invocable: true
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Agent
argument-hint: "[선택: 커밋 메시지 힌트]"
---

# /pd1 — Hygiene Pass

가장 가벼운 출하. 문서, 설정, 원라이너 수정에 사용한다.

## 사용 시점

- 1~2파일 수정, 코드 로직 변경 없음
- .gitignore, README, mem/, docs/ 수정
- 단순 오타, 설정값 변경

## 실행 절차

### Step 1: Privacy Gate

```bash
orev privacy gate . --verbose
```

BLOCK 시 즉시 중단. 사용자에게 보고.

### Step 2: Pathology 확인

변경사항을 빠르게 훑는다. Cigarette 범위는 허용하지만, Cigarette finding은 현재 패스에서 수정한다. 3회 연속 Cigarette-only review/fix cycle과 증거가 쌓일 때만 루프를 멈춘다.

- Polyp 발견 → "이 변경은 PD 3 이상이 적합합니다" 안내 후 사용자 선택
- Cancer 발견 → 즉시 중단, PD 7로 에스컬레이션 권고
- Cigarette 발견 → 현재 패스에서 수정, 근거 기록, 남은 항목과 cleanup 시도도 남김

### Step 3: Commit & PR

`/commit` 스킬을 실행한다.
- main이면 feature 브랜치 자동 생성
- PR 생성

### Verification

커밋 전 확인:
- [ ] privacy gate ALLOW 확인됨
- [ ] 변경 파일이 코드 로직을 건드리지 않음
- [ ] Polyp/Cancer 발견 없음
- [ ] Cigarette 발견 시 현재 패스 수정 완료
- [ ] 0 Cancer / 0 Polyp 확인과 증거 기록 완료

## 보고서

```
PD 1 완료!
- Privacy Gate: ALLOW
- Pathology: Cigarette N건, 현재 패스 수정 완료
- Cycle evidence: [iteration/workflow name, counts, cleanup attempt, remaining items, zero Cancer / Polyp confirmation]
- 커밋: <해시> <메시지>
- PR: <URL>
```
