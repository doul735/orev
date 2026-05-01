import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runPrivacyGate } from "../src/privacy.js";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(".");
const fixtureRoot = path.join(projectRoot, "tests", "fixtures");
const openAiKey = `sk-${"C".repeat(48)}`;
const privateKeyHeader = "-----BEGIN PRIVATE KEY-----";
const jwtToken = `eyJ${"a".repeat(21)}.eyJ${"b".repeat(21)}.${"c".repeat(21)}`;
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
  tempRoot = await mkdtemp(path.join(fixtureRoot, ".tmp-privacy-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("runPrivacyGate", () => {
  it("allows clean input and writes the default report under .orev", async () => {
    const repo = await createGitFixture();

    const { result, outPath, markdown } = await runPrivacyGate({
      target: repo,
      format: "markdown",
      failOnBlock: true,
      verbose: false
    });

    expect(result.overallDecision).toBe("ALLOW");
    expect(result.countsByDecision.ALLOW).toBe(1);
    expect(outPath).toBe(path.join(repo, ".orev", "privacy-report.md"));
    expect(markdown).toContain("Overall decision: **ALLOW**");
    await expect(readFile(outPath, "utf8")).resolves.toContain("# orev privacy gate report");
  });

  it("blocks private keys and .env files in the diff", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "key.pem"), `${privateKeyHeader}\nredacted fixture\n`);
    await writeFile(path.join(repo, ".env"), "SAFE=value\n");
    await git(["add", "key.pem", ".env"], repo);

    const { result, markdown } = await runPrivacyGate({
      target: repo,
      format: "markdown",
      failOnBlock: true,
      verbose: false
    });

    expect(result.overallDecision).toBe("BLOCK");
    expect(result.findings.map((finding) => finding.type)).toEqual(["Private Key", ".env file in diff"]);
    expect(markdown).toContain("**BLOCK** Private Key");
    expect(markdown).toContain("**BLOCK** .env file in diff");
  });

  it("redacts lower-risk token findings without exposing the raw value", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), `export const token = "${jwtToken}";\n`);

    const { result, markdown } = await runPrivacyGate({
      target: repo,
      format: "markdown",
      failOnBlock: true,
      verbose: false
    });

    expect(result.overallDecision).toBe("REDACT");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.decision).toBe("REDACT");
    expect(markdown).toContain("**REDACT** JWT Token");
    expect(markdown).not.toContain(jwtToken);
  });

  it("does not scan generated .orev reports on rerun", async () => {
    const repo = await createGitFixture();
    await mkdir(path.join(repo, ".orev"), { recursive: true });
    await writeFile(path.join(repo, ".orev", "privacy-report.md"), `raw fixture ${openAiKey}\n`);
    await git(["add", ".orev/privacy-report.md"], repo);

    const { result, markdown } = await runPrivacyGate({
      target: repo,
      format: "markdown",
      failOnBlock: true,
      verbose: false
    });

    expect(result.overallDecision).toBe("ALLOW");
    expect(result.findings).toEqual([]);
    expect(result.diffScope.nameOnly).toEqual([]);
    expect(markdown).not.toContain(openAiKey);
  });
});

describe("privacy gate CLI", () => {
  it("runs through the dev CLI and returns code 2 on BLOCK by default", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), `export const key = "${openAiKey}";\n`);

    await expect(execFileAsync("npx", ["tsx", "src/cli.ts", "privacy", "gate", repo], {
      cwd: projectRoot
    })).rejects.toMatchObject({ code: 2 });

    const report = await readFile(path.join(repo, ".orev", "privacy-report.md"), "utf8");
    expect(report).toContain("Overall decision: **BLOCK**");
    expect(report).not.toContain(openAiKey);
  });

  it("supports --no-fail-on-block for smoke-friendly blocking reports", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), `export const key = "${openAiKey}";\n`);

    const { stdout } = await execFileAsync("npx", ["tsx", "src/cli.ts", "privacy", "gate", repo, "--no-fail-on-block"], {
      cwd: projectRoot
    });

    expect(stdout).toContain("orev privacy report written:");
    expect(stdout).toContain("privacy decision: BLOCK");
  });
});
