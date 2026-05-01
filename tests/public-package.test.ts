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
    expect(pd9).not.toContain("orev review . --out");
    expect(pd9).not.toContain("orev privacy gate . --verbose");
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

    for (const content of [pd5, pd7]) {
      expect(content).toContain("independent reviewer");
      expect(content).toContain("do not count as release approval");
      expect(content).toContain("cross-model review unavailable");
    }
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
