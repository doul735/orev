# PD Series Open-Source Strategy

The PD (Pllet Data) series packages repeatable release workflows for AI coding agents.

## Concept

PD tiers are workflow skills with escalating verification depth:

| Skill | Purpose |
|---|---|
| `/pd1` | Hygiene pass for docs, config, one-liner changes |
| `/pd3` | Standard review for normal feature/bug fix work |
| `/pd5` | Medium scope — SUX_review + tests + build |
| `/pd7` | Large scope — full verification with E2E |
| `/pd9` | Full package — auth/payment/security, Cancer-zero required |

Even-numbered tiers (PD 2, 4, 6, 8) are open slots for community-contributed variants.

## Pathology Model

The PD series uses three pathology classes to explain why a finding matters:

| Class | Meaning | Workflow Response |
|---|---|---|
| Cigarette | Small harmful habit. Not urgent alone, but harmful when repeated. | PD 1 or PD 3 cleanup |
| Polyp | Localized abnormal growth. Actionable before it spreads. | PD 3 or PD 5 fix-before-release |
| Cancer | Invasive/systemic risk. Can compromise release, data, security, or trust. | PD 7/9 containment and rerun verification |

Pathology is a routing lens. It does not replace MUST-FIX, SHOULD-FIX, NIT, Quick Win, Major, or Nice-to-have.

## Public Scope

Publish these components together:

1. `orev` CLI engine
2. `skills/code-review`
3. `skills/ux-review`
4. `skills/SUX_review`
5. `skills/pd1` through `skills/pd9`
6. Architecture, pathology, and customization docs

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
    pd1/SKILL.md
    pd3/SKILL.md
    pd5/SKILL.md
    pd7/SKILL.md
    pd9/SKILL.md
    _deprecated/
      ship/SKILL.md
      ship7/SKILL.md
  docs/
    ACKNOWLEDGEMENTS.md
    ARCHITECTURE.md
    MIGRATION_ROADMAP.md
    PATHOLOGY_TAXONOMY.md
    PD_TIERS.md
    SHIP_PD_OPENSOURCE.md
```

## Release Checklist

- remove local machine paths
- remove private project references
- add MIT license
- add package metadata
- ignore generated `.orev/` artifacts
- run privacy scan, tests, and build before publishing
