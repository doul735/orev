import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(".");

async function readProjectFile(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

describe("public package documentation", () => {
  it("uses the public GitHub repository URL", async () => {
    const pkg = JSON.parse(await readProjectFile("package.json")) as {
      repository: { url: string };
      bugs: { url: string };
      homepage: string;
    };

    expect(pkg.repository.url).toBe("https://github.com/doul735/orev.git");
    expect(pkg.bugs.url).toBe("https://github.com/doul735/orev/issues");
    expect(pkg.homepage).toBe("https://github.com/doul735/orev#readme");
  });

  it("keeps active PD skills on installed orev CLI syntax", async () => {
    const activeSkills = ["pd1", "pd3", "pd5", "pd7"];
    for (const skill of activeSkills) {
      const content = await readProjectFile(`skills/${skill}/SKILL.md`);
      expect(content).not.toContain("node orev");
      expect(content).toContain("orev privacy gate . --verbose");
    }
  });

  it("runs orev review before commit in PD release skills", async () => {
    const releaseSkills = ["pd3", "pd5", "pd7"];
    for (const skill of releaseSkills) {
      const content = await readProjectFile(`skills/${skill}/SKILL.md`);
      const reviewIndex = content.indexOf("orev review . --out");
      const commitIndex = content.indexOf("/commit");
      expect(reviewIndex).toBeGreaterThan(-1);
      expect(commitIndex).toBeGreaterThan(-1);
      expect(reviewIndex).toBeLessThan(commitIndex);
    }
  });

  it("does not recommend deprecated ship skills in active tier docs", async () => {
    const tiers = await readProjectFile("docs/PD_TIERS.md");
    expect(tiers).not.toContain("- `ship`");
    expect(tiers).not.toContain("- `ship7`");
    expect(tiers).toContain("- `/pd5`");
    expect(tiers).toContain("- `/pd7`");
    expect(tiers).toContain("Selected tier: PD 1 | PD 3 | PD 5 | PD 7");
    expect(tiers).toContain("PD 9: Reserved Slot");
  });

  it("reserves PD 9 instead of making it a default release workflow", async () => {
    const pd9 = await readProjectFile("skills/pd9/SKILL.md");

    expect(pd9).toContain("reserved");
    expect(pd9).toContain("user-invocable: true");
    expect(pd9).toContain("BLOCKED: PD 9 is a reserved slot, not a release workflow");
    expect(pd9).toContain("The highest default verification tier is /pd7");
    expect(pd9).toContain("Use /pd7 for auth/payment/data/security or Cancer-zero releases");
    expect(pd9).toContain("Do not create release approval, commits, PRs, or verification evidence from PD 9");
    expect(pd9).not.toContain("orev review . --out");
    expect(pd9).not.toContain("orev privacy gate . --verbose");
  });

  it("fails closed when deterministic orev review cannot run", async () => {
    const pd3 = await readProjectFile("skills/pd3/SKILL.md");
    const pd5 = await readProjectFile("skills/pd5/SKILL.md");
    const pd7 = await readProjectFile("skills/pd7/SKILL.md");

    for (const content of [pd3, pd5, pd7]) {
      expect(content).toContain("orev 실패 시 중단하고 실패 원인을 보고한다");
      expect(content).toContain("deterministic artifact gate를 대체하지 않는다");
      expect(content).not.toContain("Claude Code 직접 분석 fallback");
    }
  });

  it("packages public launch copy with the rest of the docs", async () => {
    const pkg = JSON.parse(await readProjectFile("package.json")) as { files: string[] };

    expect(pkg.files).toContain("docs/LAUNCH_COPY.md");
    expect(pkg.files).toContain("docs/EXTERNAL_REVIEWERS.md");
  });

  it("documents a usable external reviewer setup path for PD5 and PD7", async () => {
    const externalReviewers = await readProjectFile("docs/EXTERNAL_REVIEWERS.md");
    const pd5 = await readProjectFile("skills/pd5/SKILL.md");
    const pd7 = await readProjectFile("skills/pd7/SKILL.md");

    expect(externalReviewers).toContain("OpenAI Codex CLI");
    expect(externalReviewers).toContain("record the base SHA");
    expect(externalReviewers).toContain("PATCH_TMP=$(mktemp /tmp/orev-pd-review.XXXXXX)");
    expect(externalReviewers).toContain("git diff --binary HEAD > \"$PATCH_TMP\"");
    expect(externalReviewers).toContain("final worktree snapshot against `HEAD`");
    expect(externalReviewers).toContain("PATCH_ARTIFACT=\"handoff/pd-review-${PATCH_ID}.patch\"");
    expect(externalReviewers).toContain("do not edit files between generating `${PATCH_ARTIFACT}` and running Codex");
    expect(externalReviewers).toContain("codex exec review --base <base-sha> --uncommitted --model gpt-5.4 --json");
    expect(externalReviewers).toContain("durable artifact path");
    expect(pd5).toContain("docs/EXTERNAL_REVIEWERS.md");
    expect(pd7).toContain("docs/EXTERNAL_REVIEWERS.md");
  });

  it("keeps packaged docs aligned with the PD 9 reserved-slot contract", async () => {
    const packagedDocs = [
      "README.md",
      "docs/ACKNOWLEDGEMENTS.md",
      "docs/ADAPT_THIS_WORKFLOW.md",
      "docs/ARCHITECTURE.md",
      "docs/GETTING_STARTED.md",
      "docs/MIGRATION_ROADMAP.md",
      "docs/PATHOLOGY_TAXONOMY.md",
      "docs/PD_TIERS.md",
      "docs/SHIP_PD_OPENSOURCE.md"
    ];

    for (const doc of packagedDocs) {
      const content = await readProjectFile(doc);
      expect(content).not.toContain("PD 1/3/5/7/9 release tiers");
      expect(content).not.toContain("PD 1 / 3 / 5 / 7 / 9 workflow depth tiers");
      expect(content).not.toContain("optional adversarial review");
      expect(content).not.toContain("optional hosted adversarial review");
    }
  });

  it("keeps PD5 and PD7 independent-review approval explicit", async () => {
    const pd5 = await readProjectFile("skills/pd5/SKILL.md");
    const pd7 = await readProjectFile("skills/pd7/SKILL.md");
    const architecture = await readProjectFile("docs/ARCHITECTURE.md");

    for (const content of [pd5, pd7]) {
      expect(content).toContain("independent reviewer");
      expect(content).toContain("do not count as release approval");
      expect(content).toContain("cross-model review unavailable");
      expect(content).toContain("independent reviewer Cancer and Polyp counts are 0");
      expect(content).toContain("If the independent reviewer reports Cigarette-only findings");
    }

    expect(architecture).toContain("`pd5`: SUX_review + independent reviewer + tests + build + orev review");
  });

  it("hard-stops PD5 when Cancer findings remain", async () => {
    const pd3 = await readProjectFile("skills/pd3/SKILL.md");
    const pd5 = await readProjectFile("skills/pd5/SKILL.md");
    const tiers = await readProjectFile("docs/PD_TIERS.md");

    expect(pd3).toContain("Cancer 발견 → 즉시 중단");
    expect(pd3).toContain("PD 7로 mandatory escalation");
    expect(pd3).toContain("PD 3 타입 체크/orev/커밋/PR 단계로 진행하지 않는다");
    expect(pd3).toContain("Cancer 0건 확인 또는 PD 7 escalation으로 중단");
    expect(pd3).toContain("Code Review: Cancer 0건");
    expect(pd3).toContain("Polyp 발견 → 현재 패스에서 수정");
    expect(pd3).toContain("Polyp 0건이 될 때까지 타입 체크/orev/커밋/PR 단계로 진행하지 않는다");
    expect(pd5).toContain("Cancer 발견 → 즉시 중단");
    expect(pd5).toContain("mandatory escalation");
    expect(pd5).toContain("PD 5 테스트/빌드/커밋/PR 단계로 진행하지 않는다");
    expect(pd5).toContain("Cancer-class issue를 수정한 뒤에도 PD 5로 재개하지 말고 PD 7에서 재검증한다");
    expect(pd5).toContain("If the independent reviewer reports any Cancer finding, stop PD 5 and mandatory-escalate to PD 7");
    expect(pd5).toContain("Do not continue under PD 5 after fixing a Cancer-class issue");
    expect(pd5).toContain("Polyp 발견 → 현재 패스에서 수정");
    expect(pd5).toContain("Polyp 0건이 될 때까지 independent reviewer, tests, build, commit, PR 단계로 진행하지 않는다");
    expect(pd5).toContain("code-review: Cancer 0");
    expect(pd5).toContain("ux-review: Cancer 0");
    expect(tiers).toContain("Any Cancer finding hard-stops PD 5");
  });

  it("allows equivalent executable proof when PD7 E2E is not applicable", async () => {
    const pd7 = await readProjectFile("skills/pd7/SKILL.md");
    const tiers = await readProjectFile("docs/PD_TIERS.md");
    const readme = await readProjectFile("README.md");
    const strategy = await readProjectFile("docs/SHIP_PD_OPENSOURCE.md");

    expect(pd7).toContain("E2E / equivalent executable proof");
    expect(pd7).toContain("equivalent executable coverage");
    expect(pd7).toContain("integration tests, contract tests, API smoke tests, migration dry-run, CLI/library driver script");
    expect(pd7).toContain("[blocked] executable proof unavailable");
    expect(tiers).toContain("applicable E2E or equivalent executable proof");
    expect(readme).toContain("applicable E2E/equivalent proof");
    expect(strategy).toContain("applicable E2E/equivalent proof");
  });

  it("keeps the PD5 and PD7 independent reviewer gate before commit and PR", async () => {
    const roadmap = await readProjectFile("docs/MIGRATION_ROADMAP.md");

    const reviewerIndex = roadmap.indexOf("mandatory independent adversarial review for PD 5/7");
    const commitIndex = roadmap.indexOf("commit/PR");

    expect(reviewerIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(-1);
    expect(reviewerIndex).toBeLessThan(commitIndex);
    expect(roadmap).toContain("not a PD 5 or PD 7 release-approval fallback");
    expect(roadmap).toContain("docs/EXTERNAL_REVIEWERS.md");
  });

  it("presents both install and adapt adoption paths", async () => {
    const readme = await readProjectFile("README.md");

    expect(readme).toContain("### 1. Install The CLI");
    expect(readme).toContain("### 2. Adapt The Workflow");
    expect(readme).toContain("The open-source release workflow for AI coding agents");
    expect(readme).toContain("[Adapt This Workflow](./docs/ADAPT_THIS_WORKFLOW.md)");
  });

  it("uses discovery keywords for AI coding workflows", async () => {
    const pkg = JSON.parse(await readProjectFile("package.json")) as { keywords: string[] };

    expect(pkg.keywords).toEqual(expect.arrayContaining([
      "ai-coding",
      "agent-workflow",
      "release-workflow",
      "quality-gate",
      "ux-review"
    ]));
  });
});
