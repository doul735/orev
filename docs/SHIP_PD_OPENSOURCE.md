# PD Series Open-Source Strategy

The PD (Pllet Data) series packages repeatable release workflows for AI coding agents.

## Concept

PD tiers are workflow skills with escalating verification depth:

| Skill | Purpose |
|---|---|
| `/pd1` | Hygiene pass for docs, config, one-liner changes |
| `/pd3` | Standard review for normal feature/bug fix work |
| `/pd5` | Medium scope — SUX_review + independent reviewer + tests + build |
| `/pd7` | Highest default verification — auth/payment/security/data, Cancer-zero, E2E, architecture |
| `/pd9` | Reserved custom variant slot |

Even-numbered tiers (PD 2, 4, 6, 8) are open slots for community-contributed variants.

## Pathology Model

The PD series uses three pathology classes as the canonical routing and release taxonomy:

| Class | Meaning | Workflow Response |
|---|---|---|
| Cancer | Invasive/systemic risk. Can compromise release, data, security, or trust. | PD 7 containment and rerun verification |
| Polyp | Localized abnormal growth. Actionable before it spreads. | PD 3 or PD 5 fix-before-release |
| Cigarette | Small harmful habit. Not urgent alone, but harmful when repeated. | Fix in the current pass, document evidence, and stop only after 3 consecutive Cigarette-only review/fix cycles |

Legacy labels such as MUST-FIX, SHOULD-FIX, NIT, Quick Win, Major, and Nice-to-have may appear during migration, but only as secondary metadata. Cigarette is not a skip class, it is current-pass cleanup with a 3-cycle stop rule.

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
- require independent adversarial review for PD 5 and PD 7
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
