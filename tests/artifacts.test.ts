import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ContextArtifact, DiffScopeArtifact } from "../src/types.js";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(".");
const fixtureRoot = path.join(tmpdir(), "orev-artifacts-tests");
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
  await writeFile(path.join(repo, "package.json"), "{\"name\":\"fixture\"}\n");
  await writeFile(path.join(repo, "app.ts"), "export const value = 1;\n");
  await writeFile(path.join(repo, "feature.ts"), "export const feature = false;\n");
  await mkdir(path.join(repo, "tests"));
  await writeFile(path.join(repo, "tests", "feature.test.ts"), "test('feature', () => undefined);\n");
  await git(["add", "."], repo);
  await git(["commit", "-m", "initial"], repo);
  return repo;
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

beforeEach(async () => {
  await mkdir(fixtureRoot, { recursive: true });
  tempRoot = await mkdtemp(path.join(fixtureRoot, ".tmp-artifacts-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("diff-scope command", () => {
  it("exits 0 for non-git targets and writes JSON with isGitRepo false", async () => {
    const target = path.join(tempRoot, "not-git");
    await mkdir(target);
    const outPath = path.join(tempRoot, "artifacts", "diff-scope.json");

    const { stdout } = await execFileAsync("npx", ["tsx", "src/cli.ts", "diff-scope", target, "--out", outPath], {
      cwd: projectRoot
    });

    const artifact = await readJson<DiffScopeArtifact>(outPath);
    expect(stdout).toContain("git: no");
    expect(stdout).toContain(`artifact: ${outPath}`);
    expect(artifact.kind).toBe("diff-scope");
    expect(artifact.artifactVersion).toBe(1);
    expect(artifact.diffScope.isGitRepo).toBe(false);
    expect(artifact.diffScope.nameOnly).toEqual([]);
  });

  it("writes deterministic staged and unstaged changed names to JSON", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 2;\n");
    await git(["add", "app.ts"], repo);
    await writeFile(path.join(repo, "feature.ts"), "export const feature = true;\n");
    const outPath = path.join(tempRoot, "diff-scope.json");

    await execFileAsync("npx", ["tsx", "src/cli.ts", "diff-scope", repo, "--out", outPath], {
      cwd: projectRoot
    });

    const artifact = await readJson<DiffScopeArtifact>(outPath);
    expect(artifact.diffScope.isGitRepo).toBe(true);
    expect(artifact.diffScope.nameOnly).toEqual(["app.ts", "feature.ts"]);
    expect(artifact.diffScope.stagedDiff).toContain("export const value = 2;");
    expect(artifact.diffScope.unstagedDiff).toContain("export const feature = true;");
  });

  it("does not print raw changed source lines in default stdout", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 'RAW_DIFF_SENTINEL';\n");
    const outPath = path.join(tempRoot, "diff-scope.json");

    const { stdout } = await execFileAsync("npx", ["tsx", "src/cli.ts", "diff-scope", repo, "--out", outPath], {
      cwd: projectRoot
    });

    expect(stdout).toContain("changed files: 1");
    expect(stdout).not.toContain("RAW_DIFF_SENTINEL");
    const artifact = await readJson<DiffScopeArtifact>(outPath);
    expect(artifact.diffScope.diff).toContain("RAW_DIFF_SENTINEL");
  });

  it("supports CLI smoke with npx tsx and JSON stdout summary", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 4;\n");

    const { stdout } = await execFileAsync("npx", ["tsx", "src/cli.ts", "diff-scope", repo, "--format", "json"], {
      cwd: projectRoot
    });

    expect(stdout).toContain('"kind": "diff-scope"');
    expect(stdout).toContain('"changedFileCount": 1');
    expect(stdout).not.toContain("export const value = 4;");
  });
});

describe("context command", () => {
  it("writes a JSON manifest from changed files with limits, skips, and no raw contents", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 'CONTEXT_CONTENT_SENTINEL';\n");
    await writeFile(path.join(repo, "tests", "feature.test.ts"), "test('changed', () => undefined);\n");
    const outPath = path.join(tempRoot, "context", "manifest.json");

    const { stdout } = await execFileAsync("npx", [
      "tsx",
      "src/cli.ts",
      "context",
      repo,
      "--out",
      outPath,
      "--max-files",
      "3"
    ], { cwd: projectRoot });

    const artifact = await readJson<ContextArtifact>(outPath);
    expect(stdout).toContain("context files: 3");
    expect(artifact.kind).toBe("context");
    expect(artifact.diffScopeSummary.nameOnly).toEqual(["app.ts", "tests/feature.test.ts"]);
    expect(artifact.context.entries.map((entry) => entry.path)).toEqual(["package.json", "README.md", "app.ts"]);
    expect(artifact.context.skipped).toContainEqual({
      path: "tests/feature.test.ts",
      reason: "test file skipped; pass --include-tests to include"
    });
    const rawArtifact = await readFile(outPath, "utf8");
    expect(rawArtifact).not.toContain("CONTEXT_CONTENT_SENTINEL");
    expect(rawArtifact).not.toContain("diff --git");
  });

  it("supports CLI smoke with npx tsx", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "feature.ts"), "export const feature = true;\n");
    const outPath = path.join(tempRoot, "context-smoke.json");

    const { stdout } = await execFileAsync("npx", ["tsx", "src/cli.ts", "context", repo, "--out", outPath], {
      cwd: projectRoot
    });

    expect(stdout).toContain("context files:");
    const artifact = await readJson<ContextArtifact>(outPath);
    expect(artifact.diffScopeSummary.changedFileCount).toBe(1);
    expect(artifact.context.entries.some((entry) => entry.path === "feature.ts")).toBe(true);
  });
});
