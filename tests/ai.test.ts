import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSafeAiContext } from "../src/ai/safe-context.js";
import { runReview } from "../src/review.js";
import type { AiProvider, AiProviderRequest, ContextManifest, DiffScope } from "../src/types.js";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(".");
const fixtureRoot = path.join(projectRoot, "tests", "fixtures");
const secretSentinel = `sk-${"D".repeat(48)}`;
const directProviderWarning = "⚠ --ai direct provider is experimental. Production reviews run via OMO (OhMyOpenCode).";
let tempRoot = "";

class FakeProvider implements AiProvider {
  readonly name = "fake";
  calls = 0;

  constructor(private readonly response: string) {}

  async generateJson(_request: AiProviderRequest): Promise<string> {
    this.calls += 1;
    return this.response;
  }
}

function successResponse(): string {
  return JSON.stringify({
    schemaVersion: 2,
    overallRisk: "low",
    pathologyCounts: { Cancer: 0, Polyp: 1, Cigarette: 0 },
    summary: "The change is small and supported by the provided diff.",
    dimensions: [
      { dimension: "security", risk: "low", summary: "No supported security issue found." },
      { dimension: "correctness", risk: "low", summary: "The changed value is straightforward." },
      { dimension: "crossFileConsistency", risk: "low", summary: "No cross-file inconsistency is visible." },
      { dimension: "convention", risk: "low", summary: "The change follows the existing style." },
      { dimension: "performance", risk: "low", summary: "No performance concern is supported." },
      { dimension: "architecture", risk: "low", summary: "No architecture concern is supported." }
    ],
    findings: [{
      dimension: "correctness",
      severity: "info",
      pathology: "Polyp",
      title: "Review completed",
      evidence: "app.ts changed one exported value.",
      recommendation: "Keep deterministic tests around the changed behavior.",
      blastRadius: "Only the changed app.ts export is affected.",
      infectionPath: "Future callers could rely on the changed exported value without coverage.",
      containment: "Add deterministic tests around the exported behavior.",
      confidence: 0.8,
      file: "app.ts",
      line: 1
    }]
  });
}

function uxSuccessResponse(): string {
  return JSON.stringify({
    schemaVersion: 2,
    target: "Changed onboarding flow",
    pathologyCounts: { Cancer: 0, Polyp: 1, Cigarette: 2 },
    summary: "The flow is understandable, but feedback and empty states need clearer planning.",
    findings: [
      {
        lens: "feedbackInteraction",
        category: "quickWin",
        pathology: "Cigarette",
        title: "Add save confirmation",
        current: "The changed flow does not show a visible success confirmation in the provided context.",
        suggestion: "Show a short confirmation after the user completes the action.",
        blastRadius: "The affected save flow can feel ambiguous after completion.",
        infectionPath: "Similar flows may omit feedback if this pattern remains normalized.",
        containment: "Document and test the success confirmation expectation.",
        confidence: 0.82,
        file: "app.ts",
        line: 1
      },
      {
        lens: "stateHandling",
        category: "major",
        pathology: "Polyp",
        title: "Plan empty state copy",
        current: "No empty state behavior is visible for first-time users.",
        suggestion: "Define empty state copy and next action before release.",
        blastRadius: "First-time users can hit an unclear onboarding state.",
        infectionPath: "Other onboarding states may ship without recovery copy.",
        containment: "Add empty state acceptance criteria before release.",
        confidence: 0.74
      },
      {
        lens: "accessibility",
        category: "niceToHave",
        pathology: "Cigarette",
        title: "Clarify keyboard focus path",
        current: "The context does not describe focus order for the new interaction.",
        suggestion: "Document the expected keyboard path for QA.",
        blastRadius: "Keyboard users may have inconsistent navigation expectations.",
        infectionPath: "Undocumented focus behavior can repeat in adjacent interactions.",
        containment: "Include keyboard path notes in QA coverage.",
        confidence: 0.68
      }
    ]
  });
}

function legacyCodeSuccessResponse(): string {
  const parsed = JSON.parse(successResponse()) as Record<string, unknown>;
  parsed.schemaVersion = 1;
  delete parsed.pathologyCounts;
  const findings = parsed.findings as Array<Record<string, unknown>>;
  for (const finding of findings) {
    delete finding.pathology;
    delete finding.blastRadius;
    delete finding.infectionPath;
    delete finding.containment;
  }
  return JSON.stringify(parsed);
}

function legacyUxSuccessResponse(): string {
  const parsed = JSON.parse(uxSuccessResponse()) as Record<string, unknown>;
  parsed.schemaVersion = 1;
  delete parsed.pathologyCounts;
  const findings = parsed.findings as Array<Record<string, unknown>>;
  for (const finding of findings) {
    delete finding.pathology;
    delete finding.blastRadius;
    delete finding.infectionPath;
    delete finding.containment;
  }
  return JSON.stringify(parsed);
}

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
  tempRoot = await mkdtemp(path.join(fixtureRoot, ".tmp-ai-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("AI review orchestration", () => {
  it("keeps non-AI review reports without an AI section", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 2;\n");
    const { markdown, result } = await runReview({
      target: repo,
      out: path.join(tempRoot, "non-ai.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false
    });

    expect(result.ai).toBeUndefined();
    expect(markdown).not.toContain("## AI Verified Review");
    expect(markdown).toContain("Review mode: deterministic MVP checks only; no semantic LLM code review was run.");
  });

  it("renders pathology counts and six dimensions when a fake provider returns valid JSON", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 3;\n");
    const provider = new FakeProvider(successResponse());

    const { markdown, result } = await runReview({
      target: repo,
      out: path.join(tempRoot, "ai.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(provider.calls).toBe(1);
    expect(result.ai?.status).toBe("success");
    expect(result.ai?.review?.mode).toBe("code");
    expect(result.ai?.review?.pathologyCounts).toEqual({ Cancer: 0, Polyp: 1, Cigarette: 0 });
    expect(result.ai?.review?.mode === "code" ? result.ai.review.dimensions : []).toHaveLength(6);
    expect(markdown).toContain("## AI Verified Review");
    expect(markdown).toContain("### Pathology Summary");
    expect(markdown).toContain("- Cancer: 0");
    expect(markdown).toContain("- Polyp: 1");
    expect(markdown).toContain("### Polyp");
    expect(markdown).toContain("Blast radius: Only the changed app.ts export is affected.");
    expect(markdown).toContain("**security** (low)");
    expect(markdown).toContain("**architecture** (low)");
  });

  it("renders UX review pathology headings from a fake provider", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 31;\n");
    const provider = new FakeProvider(uxSuccessResponse());

    const { markdown, result } = await runReview({
      target: repo,
      out: path.join(tempRoot, "ux-ai.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "ux",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(provider.calls).toBe(1);
    expect(result.ai?.status).toBe("success");
    expect(result.ai?.review?.mode).toBe("ux");
    expect(result.ai?.review?.pathologyCounts).toEqual({ Cancer: 0, Polyp: 1, Cigarette: 2 });
    expect(markdown).toContain("## 기획 리뷰: Changed onboarding flow");
    expect(markdown).toContain("### 요약");
    expect(markdown).toContain("### Pathology Summary");
    expect(markdown).toContain("- Polyp: 1");
    expect(markdown).toContain("- Cigarette: 2");
    expect(markdown).toContain("### Cigarette");
    expect(markdown).toContain("### Polyp");
    expect(markdown).toContain("관점: feedbackInteraction");
    expect(markdown).toContain("노력 메타데이터: quickWin");
    expect(markdown).toContain("현재: The changed flow does not show");
    expect(markdown).toContain("제안: Show a short confirmation");
    expect(markdown).toContain("Containment: Document and test the success confirmation expectation.");
    expect(markdown).toContain("위치: `app.ts:1`");
  });

  it("skips provider calls when privacy blocks and CLI exits 2 by default", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), `export const key = "${secretSentinel}";\n`);
    const provider = new FakeProvider(successResponse());

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "blocked-ai.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(provider.calls).toBe(0);
    expect(result.ai?.status).toBe("skipped");
    expect(result.ai?.privacyDecision).toBe("BLOCK");
    expect(markdown).toContain("provider was not called");

    await expect(execFileAsync("npx", ["tsx", "src/cli.ts", "review", repo, "--ai", "--model", "claude", "--out", path.join(tempRoot, "cli-blocked.md")], {
      cwd: projectRoot,
      env: { ...process.env, ANTHROPIC_API_KEY: "" }
    })).rejects.toMatchObject({ code: 2, stderr: expect.stringContaining(directProviderWarning) });
  });

  it("fails closed before network when the real provider path has no API key", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 4;\n");
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { result, markdown } = await runReview({
        target: repo,
        out: path.join(tempRoot, "missing-key.md"),
        format: "markdown",
        maxFiles: 10,
        maxBytes: 10000,
        includeTests: false,
        failOnSecrets: true,
        verbose: false,
        ai: {
          enabled: true,
          mode: "code",
          model: "claude",
          maxAiContextBytes: 120000,
          maxAiOutputTokens: 3000,
          aiTimeoutMs: 60000
        }
      });

      expect(result.ai?.status).toBe("failed");
      expect(markdown).toContain("ANTHROPIC_API_KEY is required");
    } finally {
      if (original === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = original;
      }
    }
  });

  it("CLI exits 1 and writes missing key reason when AI is requested without API key", async () => {
    const repo = await createGitFixture();
    const outPath = path.join(tempRoot, "cli-missing-key.md");

    await expect(execFileAsync("npx", ["tsx", "src/cli.ts", "review", repo, "--ai", "--model", "claude", "--out", outPath], {
      cwd: projectRoot,
      env: { ...process.env, ANTHROPIC_API_KEY: "" }
    })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(directProviderWarning) });
    await expect(readFile(outPath, "utf8")).resolves.toContain("ANTHROPIC_API_KEY is required");
  });

  it("CLI accepts --mode ux, fails closed without API key, and writes the report", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 41;\n");
    const outPath = path.join(tempRoot, "cli-ux-missing-key.md");

    await expect(execFileAsync("npx", ["tsx", "src/cli.ts", "review", repo, "--ai", "--mode", "ux", "--model", "claude", "--out", outPath], {
      cwd: projectRoot,
      env: { ...process.env, ANTHROPIC_API_KEY: "" }
    })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(directProviderWarning) });
    await expect(readFile(outPath, "utf8")).resolves.toContain("## 기획 리뷰: UX mode");
    await expect(readFile(outPath, "utf8")).resolves.toContain("ANTHROPIC_API_KEY is required");
  });

  it("rejects invalid review mode before running review", async () => {
    const repo = await createGitFixture();
    const outPath = path.join(tempRoot, "invalid-mode.md");

    await expect(execFileAsync("npx", ["tsx", "src/cli.ts", "review", repo, "--mode", "product", "--out", outPath], {
      cwd: projectRoot
    })).rejects.toMatchObject({ code: 1 });
    await expect(readFile(outPath, "utf8")).rejects.toThrow();
  });

  it("fails closed when provider JSON does not match the schema", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 5;\n");
    const provider = new FakeProvider(JSON.stringify({ schemaVersion: 1, summary: "legacy schema missing required pathology fields" }));

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "invalid-json.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(provider.calls).toBe(1);
    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI response schema mismatch");
  });

  it("fails closed when schema v2 pathology counts are omitted", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 52;\n");
    const parsed = JSON.parse(successResponse()) as Record<string, unknown>;
    delete parsed.pathologyCounts;
    const provider = new FakeProvider(JSON.stringify(parsed));

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "derived-counts.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI response pathology counts do not match findings");
  });

  it("fails closed when schema v2 pathology counts disagree with findings", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 56;\n");
    const parsed = JSON.parse(successResponse()) as Record<string, unknown>;
    parsed.pathologyCounts = { Cancer: 1, Polyp: 0, Cigarette: 0 };
    const provider = new FakeProvider(JSON.stringify(parsed));

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "mismatched-counts.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI response pathology counts do not match findings");
  });

  it("fails closed when schema v2 findings omit canonical pathology fields", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 55;\n");
    const parsed = JSON.parse(successResponse()) as Record<string, unknown>;
    const findings = parsed.findings as Array<Record<string, unknown>>;
    delete findings[0].pathology;
    const provider = new FakeProvider(JSON.stringify(parsed));

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "malformed-v2.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI response contains an invalid finding");
  });

  it("accepts legacy schema v1 code provider responses and derives pathology fields", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 53;\n");
    const provider = new FakeProvider(legacyCodeSuccessResponse());

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "legacy-code.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(result.ai?.status).toBe("success");
    expect(result.ai?.review?.schemaVersion).toBe(2);
    expect(result.ai?.review?.pathologyCounts).toEqual({ Cancer: 0, Polyp: 0, Cigarette: 1 });
    expect(markdown).toContain("Derived from legacy schema v1 severity metadata.");
  });

  it("fails closed for legacy schema v1 UX provider responses", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 54;\n");
    const provider = new FakeProvider(legacyUxSuccessResponse());

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "legacy-ux.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "ux",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI UX response schema mismatch");
  });

  it("fails closed when UX mode receives the code review schema", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 51;\n");
    const provider = new FakeProvider(successResponse());

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "ux-code-schema.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "ux",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(provider.calls).toBe(1);
    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI UX response schema mismatch");
    expect(markdown).toContain("## 기획 리뷰: UX mode");
  });

  it("fails closed when provider output contains a raw secret-like value", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), "export const value = 6;\n");
    const provider = new FakeProvider(JSON.stringify({
      schemaVersion: 2,
      overallRisk: "low",
      pathologyCounts: { Cancer: 0, Polyp: 0, Cigarette: 0 },
      summary: `Leaked value ${secretSentinel}`,
      dimensions: [
        { dimension: "security", risk: "low", summary: "No supported security issue found." },
        { dimension: "correctness", risk: "low", summary: "The changed value is straightforward." },
        { dimension: "crossFileConsistency", risk: "low", summary: "No cross-file inconsistency is visible." },
        { dimension: "convention", risk: "low", summary: "The change follows the existing style." },
        { dimension: "performance", risk: "low", summary: "No performance concern is supported." },
        { dimension: "architecture", risk: "low", summary: "No architecture concern is supported." }
      ],
      findings: []
    }));

    const { result, markdown } = await runReview({
      target: repo,
      out: path.join(tempRoot, "leaky-provider.md"),
      format: "markdown",
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false,
      failOnSecrets: true,
      verbose: false,
      ai: {
        enabled: true,
        mode: "code",
        model: "claude",
        maxAiContextBytes: 120000,
        maxAiOutputTokens: 3000,
        aiTimeoutMs: 60000,
        provider
      }
    });

    expect(provider.calls).toBe(1);
    expect(result.ai?.status).toBe("failed");
    expect(result.ai?.review).toBeUndefined();
    expect(markdown).toContain("AI response contains a raw secret-like value");
    expect(markdown).not.toContain(secretSentinel);
  });
});

describe("buildSafeAiContext", () => {
  it("excludes .orev, respects max bytes, and omits raw secrets unless privacy allows", async () => {
    const repo = await createGitFixture();
    await mkdir(path.join(repo, ".orev"), { recursive: true });
    await writeFile(path.join(repo, ".orev", "privacy-report.md"), `artifact ${secretSentinel}\n`);
    await writeFile(path.join(repo, "app.ts"), `export const key = "${secretSentinel}";\n`);

    const diffScope: DiffScope = {
      isGitRepo: true,
      root: repo,
      diff: `diff --git a/app.ts b/app.ts\n+export const key = "${secretSentinel}";\n`,
      stagedDiff: "",
      unstagedDiff: "",
      nameOnly: [".orev/privacy-report.md", "app.ts"],
      stat: "app.ts | 1 +",
      errors: []
    };
    const context: ContextManifest = {
      entries: [
        { path: ".orev/privacy-report.md", bytes: 64, reason: "changed file" },
        { path: "app.ts", bytes: 80, reason: "changed file" }
      ],
      skipped: [],
      totalBytes: 144,
      maxFiles: 10,
      maxBytes: 10000
    };

    const blocked = await buildSafeAiContext({
      root: repo,
      diffScope,
      context,
      privacyDecision: "BLOCK",
      maxBytes: 180
    });

    expect(blocked.byteCount).toBeLessThanOrEqual(180);
    expect(blocked.truncated).toBe(true);
    expect(blocked.text).not.toContain(".orev/privacy-report.md");
    expect(blocked.text).not.toContain(secretSentinel);
    expect(blocked.includedFiles).toEqual([]);
  });

  it("redacts pre-existing secret-like file content when privacy allows", async () => {
    const repo = await createGitFixture();
    await writeFile(path.join(repo, "app.ts"), `export const existing = "${secretSentinel}";\n`);

    const diffScope: DiffScope = {
      isGitRepo: true,
      root: repo,
      diff: "diff --git a/README.md b/README.md\n+Updated docs\n",
      stagedDiff: "",
      unstagedDiff: "",
      nameOnly: [".orev/cache.md", ".env", "app.ts", "README.md"],
      stat: `app.ts | 1 + ${secretSentinel}`,
      errors: []
    };
    const context: ContextManifest = {
      entries: [
        { path: ".orev/cache.md", bytes: 64, reason: "changed file" },
        { path: ".env", bytes: 32, reason: "changed file" },
        { path: "app.ts", bytes: 90, reason: "changed file" }
      ],
      skipped: [],
      totalBytes: 186,
      maxFiles: 10,
      maxBytes: 10000
    };

    const allowed = await buildSafeAiContext({
      root: repo,
      diffScope,
      context,
      privacyDecision: "ALLOW",
      maxBytes: 10000
    });

    expect(allowed.text).not.toContain(secretSentinel);
    expect(allowed.text).toContain("[REDACTED OpenAI API Key]");
    expect(allowed.text).not.toContain(".orev/cache.md");
    expect(allowed.text).not.toContain(".env");
    expect(allowed.includedFiles).toEqual(["app.ts"]);
  });
});
