# Launch Copy

Use this file as a source for public launch posts. English comes first, then Korean.

## English

### GitHub Description

Privacy-gated review and release workflows for AI coding agents.

### GitHub About

Use orev as a CLI, or adapt its PD-tier review workflow for your own AI coding agent setup.

### One-Liner Variants

- The open-source release workflow for AI coding agents.
- Stop shipping AI-generated code like a toy project.
- Privacy gates, review tiers, and release proof for agent-driven development.
- Install it if you use Claude Code. Steal the workflow if you use any AI coding agent.

### LinkedIn Post

I’m opening `orev`, an open-source release workflow for AI coding agents.

AI agents can change code fast. But fast changes still need release discipline.

`orev` gives you two paths:

1. Install the CLI and generate local privacy, diff, context, and review artifacts.
2. Adapt the PD-tier workflow and review skills into your own agent setup.

The workflow is built around a simple idea: small changes and critical changes should not pass through the same gate.

PD 1 is for docs and config.
PD 3 is for normal fixes.
PD 5 is for feature work that needs an independent reviewer gate.
PD 7 is for release proof, including auth, payment, data, security, and Cancer-zero releases.
PD 9 is reserved for custom variants.

It also uses a code pathology model, Cigarette / Polyp / Cancer, to explain how far a review finding can spread and how hard it needs to be contained.

Use the CLI if it fits your stack. Or ask your coding agent to study the repo and adapt the workflow to your own environment.

Repo: https://github.com/doul735/orev

### Blog Post

# orev: A Release Workflow For AI Coding Agents

AI coding agents changed the speed of software development. They can generate diffs, patch bugs, and refactor code faster than most teams can review the consequences.

That speed is useful. It is also dangerous if every change goes through the same loose definition of “done.”

`orev` is an open-source review and release workflow suite for AI coding agents. It is not just another code review prompt. It is a small release discipline layer for agent-driven development.

The project has two parts.

The first is a CLI engine. It creates deterministic local artifacts: a privacy gate, a diff-scope artifact, a bounded context manifest, and a review report. The CLI does not call an LLM by default. Its job is to make review inputs safer and inspectable.

The second is a skill suite. The default PD series, PD 1 / 3 / 5 / 7, maps change risk to verification depth, while PD 9 is reserved for custom variants. A docs change should not need the same process as a payment or authentication change. A large release candidate should not be treated like a typo fix.

The tiers are simple:

- PD 1: docs, config, one-liners
- PD 3: normal feature or bug fix
- PD 5: medium feature work with post-PR GitHub Codex approval, tests, and build
- PD 7: release proof for large, auth, payment, data, security, and Cancer-zero changes
- PD 9: reserved custom variant slot

`orev` also introduces a review vocabulary called code pathology. Findings are classified as Cigarette, Polyp, or Cancer. The point is not drama. The point is spread risk. Some issues are small bad habits. Some are localized growths that should be removed before they spread. Some are systemic release blockers.

You can use `orev` in two ways.

Install it directly if you want the CLI and skills. Or use the repo as a reference workflow. Ask your coding agent to read it and adapt the PD tiers, pathology taxonomy, and verification gates to your own environment.

The goal is practical: before AI-generated code ships, block secrets, collect deterministic context, review code and UX separately, run the right verification depth, and make the agent prove completion with fresh evidence.

Repo: https://github.com/doul735/orev

### Threads Post

Opening `orev` today.

A privacy-gated review + release workflow for AI coding agents.

Use it directly as a CLI, or adapt the PD tiers and review skills into your own setup.

PD 1: tiny changes
PD 3: normal fixes
PD 5: independent reviewer + tests
PD 7: release proof + auth/payment/security
PD 9: reserved slot

Repo: https://github.com/doul735/orev

## Korean

### GitHub Description

AI 코딩 에이전트를 위한 privacy-gated review/release workflow.

### GitHub About

orev를 CLI로 직접 쓰거나, PD tier review workflow를 자기 AI coding agent 환경에 맞게 적용하세요.

### One-Liner Variants

- AI 코딩 에이전트를 위한 오픈소스 릴리즈 워크플로우.
- AI가 만든 코드를 장난감 프로젝트처럼 출하하지 않기 위한 도구.
- Privacy gate, review tier, release proof를 agent-driven development에 붙입니다.
- Claude Code를 쓰면 설치하고, 다른 에이전트를 쓰면 workflow를 가져가세요.

### LinkedIn Post

`orev`를 오픈소스로 공개합니다.

AI 코딩 에이전트는 코드를 빠르게 바꿉니다. 하지만 빠른 변경에도 릴리즈 규율은 필요합니다.

`orev`는 두 가지 방식으로 쓸 수 있습니다.

1. CLI를 설치해서 privacy, diff, context, review artifact를 로컬에서 생성
2. PD tier workflow와 review skill을 자기 에이전트 환경에 맞게 적용

핵심 아이디어는 단순합니다. 작은 변경과 치명적인 변경은 같은 게이트를 통과하면 안 됩니다.

PD 1은 문서와 설정.
PD 3은 일반 버그 수정.
PD 5는 독립 reviewer gate가 필요한 기능 작업.
PD 7은 인증, 결제, 데이터, 보안, Cancer-zero까지 포함하는 릴리즈 증명.
PD 9는 custom variant를 위한 reserved slot입니다.

그리고 Cigarette / Polyp / Cancer라는 코드 병리학 분류로 리뷰 finding의 확산 위험과 containment 기준을 설명합니다.

CLI가 맞으면 그대로 쓰면 됩니다. 이미 자기 개발환경이 있다면, 에이전트에게 repo를 읽히고 자기 환경에 맞게 workflow를 가져가도 됩니다.

Repo: https://github.com/doul735/orev

### Blog Post

# orev: AI 코딩 에이전트를 위한 릴리즈 워크플로우

AI 코딩 에이전트는 소프트웨어 개발 속도를 바꿨습니다. diff를 만들고, 버그를 고치고, 리팩토링을 하는 속도가 사람이 검토하는 속도보다 빨라졌습니다.

그 속도는 유용합니다. 하지만 모든 변경을 같은 “완료” 기준으로 출하하면 위험합니다.

`orev`는 AI 코딩 에이전트를 위한 오픈소스 review/release workflow suite입니다. 단순한 코드 리뷰 프롬프트가 아니라, agent-driven development에 붙이는 작은 릴리즈 규율 레이어입니다.

프로젝트는 두 부분으로 나뉩니다.

첫 번째는 CLI engine입니다. privacy gate, diff-scope artifact, bounded context manifest, deterministic review report를 로컬에서 생성합니다. 기본적으로 LLM을 호출하지 않습니다. 목적은 리뷰 입력을 안전하고 검증 가능하게 만드는 것입니다.

두 번째는 skill suite입니다. 기본 PD 시리즈인 PD 1 / 3 / 5 / 7은 변경 위험도에 따라 검증 깊이를 다르게 가져가고, PD 9는 custom variant 슬롯으로 남깁니다. 문서 수정과 결제 로직 변경이 같은 과정을 거치면 안 됩니다. 대규모 릴리즈 후보를 오타 수정처럼 다루면 안 됩니다.

단계는 단순합니다.

- PD 1: 문서, 설정, 원라이너
- PD 3: 일반 기능 또는 버그 수정
- PD 5: 독립 reviewer 승인, 테스트, 빌드가 필요한 기능 작업
- PD 7: 큰 변경, 인증, 결제, 데이터, 보안, Cancer-zero 릴리즈 증명
- PD 9: custom variant reserved slot

`orev`는 코드 병리학이라는 리뷰 언어도 사용합니다. finding을 Cigarette, Polyp, Cancer로 분류합니다. 자극적인 표현이 목적이 아닙니다. 핵심은 확산 위험입니다. 어떤 문제는 작은 나쁜 습관이고, 어떤 문제는 퍼지기 전에 제거해야 하는 국소 위험이며, 어떤 문제는 릴리즈를 막아야 하는 시스템 리스크입니다.

`orev`는 두 가지 방식으로 쓸 수 있습니다.

CLI와 스킬을 직접 설치해도 되고, repo를 레퍼런스 workflow로 사용해도 됩니다. 자기 코딩 에이전트에게 이 repo를 읽히고 PD tier, pathology taxonomy, verification gate를 자기 개발환경에 맞게 적용시키면 됩니다.

목표는 실용적입니다. AI가 만든 코드가 출하되기 전에 secret을 막고, deterministic context를 모으고, code/UX를 분리해서 리뷰하고, 변경 위험도에 맞는 검증을 실행하고, 에이전트가 fresh evidence 없이 완료를 주장하지 못하게 하는 것입니다.

Repo: https://github.com/doul735/orev

### Threads Post

`orev`를 오픈소스로 공개합니다.

AI 코딩 에이전트를 위한 privacy-gated review + release workflow입니다.

CLI로 직접 쓰거나, PD tier와 review skill을 자기 환경에 맞게 적용할 수 있습니다.

PD 1: 작은 변경
PD 3: 일반 수정
PD 5: 독립 reviewer + 테스트
PD 7: 릴리즈 증명 + 인증/결제/보안
PD 9: reserved slot

Repo: https://github.com/doul735/orev
