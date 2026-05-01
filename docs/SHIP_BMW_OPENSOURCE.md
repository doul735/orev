# Ship Series Open-Source Strategy

The ship series packages repeatable release workflows for AI coding agents.

## Concept

`/ship` and `/ship7` are workflow skills:

| Skill | Purpose |
|---|---|
| `/ship` | Review, fix, build-check, commit, PR, and adversarial review |
| `/ship7` | `/ship` plus executable tests, production build, and stronger release gates |

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
    SHIP_BMW_OPENSOURCE.md
```

## Release Checklist

- remove local machine paths
- remove private project references
- add MIT license
- add package metadata
- ignore generated `.orev/` artifacts
- run privacy scan, tests, and build before publishing
