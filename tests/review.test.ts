import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderMarkdownReport } from "../src/report.js";
import { runReview } from "../src/review.js";
import type { ReviewResult } from "../src/types.js";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(".");
const fixtureRoot = path.join(projectRoot, "tests", "fixtures");
let tempRoot = "";

async function git(args: string[], cwd: string): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

async function createGitFixture(): Promise<string> {
  const repo = path.join(tempRoot, "repo");
  await mkdir(repo, { recursive: true });
  await git(["init"], repo);
  await git(["config", "user.email", "orev@example.test"], repo);
  await git(["config", "user.name", "orev test"], repo);
  await writeFile(path.join(repo, "README.md"), "# Repo\n");
  await writeFile(path.join(repo, "app.ts"), "export const value = 1;\n");
  await git(["add", "."], repo);
  await git(["commit", "-m", "initial"], repo);
  return repo;
}

beforeEach(async () => {
  await mkdir(fixtureRoot, { recursive: true });
  tempRoot = await mkdtemp(path.join(fixtureRoot, ".tmp-review-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("runReview", () => {
  it("handles non-existent and non-git targets gracefully", async () => {
    const outPath = path.join(tempRoot, "missing.md");
    const { result, markdown } = await runReview({
      target: path.join(tempRoot, "missing"),
      out: outPath,
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: false,
      verbose: false
    });

    expect(result.diffScope.isGitRepo).toBe(false);
    expect(result.findings.some((finding) => finding.title === "Target is not a git repository")).toBe(true);
    expect(markdown).toContain("## Findings");
    await expect(readFile(outPath, "utf8")).resolves.toContain("not a git repository");
  });

  it("refuses to write reports inside the target project", async () => {
    const repo = await createGitFixture();

    await expect(runReview({
      target: repo,
      out: path.join(repo, "report.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: false,
      verbose: false
    })).rejects.toThrow("Refusing to write the report inside the target project");
  });

  it("refuses default output when cwd is inside the target project", async () => {
    const repo = await createGitFixture();
    const originalCwd = process.cwd();
    process.chdir(repo);
    try {
      await expect(runReview({
        target: repo,
        format: "markdown",
        maxFiles: 10,
        maxBytes: 10000,
        includeTests: false,
        failOnSecrets: false,
        verbose: false
      })).rejects.toThrow("Refusing to write the default report inside the target project");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("refuses symlink output paths", async () => {
    const repo = await createGitFixture();
    const realReport = path.join(tempRoot, "real-report.md");
    const linkReport = path.join(tempRoot, "link-report.md");
    await writeFile(realReport, "existing\n");
    await symlink(realReport, linkReport);

    await expect(runReview({
      target: repo,
      out: linkReport,
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: false,
      verbose: false
    })).rejects.toThrow("Refusing to write report through a symlink output path");
  });

  it("collects git diff scope without writing to target project", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), `export const value = \"sk-${"B".repeat(48)}\";\n`);
    const outPath = path.join(tempRoot, "report.md");

    const { result, markdown } = await runReview({
      target: repo,
      out: outPath,
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: false,
      verbose: false
    });

    expect(result.diffScope.isGitRepo).toBe(true);
    expect(result.diffScope.nameOnly).toEqual(["app.ts"]);
    expect(result.secrets).toHaveLength(1);
    expect(markdown).toContain("Security gate: BLOCKED");
    expect(markdown).not.toContain("B".repeat(48));
    await expect(readFile(path.join(repo, "orev-review.md"), "utf8")).rejects.toThrow();
  });
});

describe("renderMarkdownReport", () => {
  it("renders required sections", () => {
    const result: ReviewResult = {
      target: ".",
      resolvedTarget: "/tmp/example",
      generatedAt: "2026-01-01T00:00:00.000Z",
      diffScope: {
        isGitRepo: true,
        root: "/tmp/example",
        diff: "",
        stagedDiff: "",
        unstagedDiff: "",
        nameOnly: [],
        stat: "",
        errors: []
      },
      secrets: [],
      context: {
        entries: [],
        skipped: [],
        totalBytes: 0,
        maxFiles: 10,
        maxBytes: 10000
      },
      findings: []
    };

    expect(renderMarkdownReport(result)).toContain("## Summary");
    expect(renderMarkdownReport(result)).toContain("## Security Gate");
    expect(renderMarkdownReport(result)).toContain("## Diff Scope");
    expect(renderMarkdownReport(result)).toContain("## Context Manifest");
    expect(renderMarkdownReport(result)).toContain("## Findings");
    expect(renderMarkdownReport(result)).toContain("## Skipped In MVP");
  });
});

describe("CLI smoke", () => {
  it("writes a report via orev review", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 2;\n");
    const outPath = path.join(tempRoot, "cli-report.md");

    const { stdout } = await execFileAsync("npx", ["tsx", "src/cli.ts", "review", repo, "--out", outPath], {
      cwd: projectRoot
    });

    expect(stdout).toContain("orev report written:");
    await expect(readFile(outPath, "utf8")).resolves.toContain("# orev review report");
  });

  it("runs the built package bin after build", async () => {
    await execFileAsync("npm", ["run", "build"], { cwd: projectRoot });
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 3;\n");
    const outPath = path.join(tempRoot, "bin-report.md");

    const { stdout } = await execFileAsync("npm", ["exec", "--", "orev", "review", repo, "--out", outPath], {
      cwd: projectRoot
    });

    expect(stdout).toContain("orev report written:");
    await expect(readFile(outPath, "utf8")).resolves.toContain("# orev review report");
  });
});
