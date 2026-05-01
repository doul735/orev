# Ship Series Open-Source Strategy

The ship series packages repeatable release workflows for AI coding agents.

## Concept

`/ship` and `/ship7` are workflow skills:

| Skill | Purpose |
|---|---|
| `/ship1` concept | lightweight hygiene pass for tiny low-risk changes |
| `/ship3` concept | standard review workflow for normal feature work |
| `/ship` | Review, fix, build-check, commit, PR, and adversarial review |
| `/ship7` | `/ship` plus executable tests, production build, and stronger release gates |

The public product name is the ship series. The initial implementation ships `/ship` and `/ship7`; `/ship1`, `/ship3`, and `/ship5` are tier concepts that can become concrete skills when the workflows stabilize.

## Pathology Model

The ship series uses three pathology classes to explain why a finding matters:

| Class | Meaning | Workflow Response |
|---|---|---|
| Cigarette | Small harmful habit. Not urgent alone, but harmful when repeated. | PD 1 or PD 3 cleanup |
| Polyp | Localized abnormal growth. Actionable before it spreads. | PD 3 or PD 5 fix-before-release |
| Cancer | Invasive/systemic risk. Can compromise release, data, security, or trust. | PD 7 containment and rerun verification |

Pathology is a routing lens. It does not replace MUST-FIX, SHOULD-FIX, NIT, Quick Win, Major, or Nice-to-have.

## PD Tiers

| Tier | Use When | Default Workflow |
|---|---|---|
| PD 1 | docs/copy/tiny local change, Cigarette only | privacy gate + targeted check |
| PD 3 | normal feature or bug fix, localized Polyp risk | code-review + ux-review or SUX_review |
| PD 5 | important feature, cross-file behavior, medium release risk | ship |
| PD 7 | auth/payment/data/security, large diff, confirmed Cancer | ship7 |

## Public Scope

Publish these components together:

1. `orev` CLI engine
2. `skills/code-review`
3. `skills/ux-review`
4. `skills/SUX_review`
5. `skills/ship`
6. `skills/ship7`
7. architecture and customization docs

## Design Principles

- keep review inputs local and deterministic
- block secrets before AI review
- keep code review and UX review separate
- run tests/builds before merge
- use OMO for production adversarial review
- keep direct provider/API review experimental and self-hosted

## Repository Shape

```text
orev/
  README.md
  LICENSE
  package.json
  src/
  tests/
  skills/
    code-review/SKILL.md
    ux-review/SKILL.md
    SUX_review/SKILL.md
    ship/SKILL.md
    ship7/SKILL.md
  docs/
    MIGRATION_ROADMAP.md
    SHIP_PD_OPENSOURCE.md
    ARCHITECTURE.md
    PATHOLOGY_TAXONOMY.md
    PD_TIERS.md
```

## Release Checklist

- remove local machine paths
- remove private project references
- add MIT license
- add package metadata
- ignore generated `.orev/` artifacts
- run privacy scan, tests, and build before publishing
