# Acknowledgements

orev draws inspiration from several open-source projects.

## Direct Influences

| Project | Author | What We Adopted | License |
|---------|--------|-----------------|---------|
| [mattpocock/skills](https://github.com/mattpocock/skills) | Matt Pocock | `diagnose` (structured debugging), `caveman` (token compression), `grill-me` / `grill-with-docs` (design grilling), `zoom-out` (system context), `to-prd` / `to-issues` (planning-to-execution) | MIT |
| [obra/superpowers](https://github.com/obra/superpowers) | Jesse Vincent | `verification-before-completion` (evidence-before-claims principle) | MIT |
| [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) | Forrest Chang / Andrej Karpathy | Four behavioral principles (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution) | MIT |

## Conceptual Influences

| Project | What We Learned |
|---------|-----------------|
| [garrytan/gstack](https://github.com/garrytan/gstack) | Tiered review depth, `canary` post-deploy monitoring concept, `investigate` root-cause analysis, `cso` threat modeling |
| [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | Context decay problem, discuss-plan-execute loop, STATE.md persistence |
| [anthropics/skills](https://github.com/anthropics/skills) | Skill format reference (SKILL.md frontmatter convention) |

## Original Work

The following are original to this project:

- **orev CLI**: privacy gate, diff-scope, context manifest, deterministic review report
- **Code Pathology Taxonomy**: Cigarette / Polyp / Cancer classification with blast radius, infection path, and containment
- **PD Tier System**: PD 1 / 3 / 5 / 7 workflow depth tiers with pathology-based escalation, plus reserved custom variant slots such as PD 9
- **Privacy Gate**: ALLOW / REDACT / SUMMARIZE / BLOCK four-level decision system
- **Independent review integration**: mandatory adversarial review for PD 5 and PD 7 using external review runtimes or independent reviewer models
- **SUX_review**: parallel code + UX review orchestration
