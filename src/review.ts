import { constants } from "node:fs";
import { lstat, mkdir, open, realpath } from "node:fs/promises";
import path from "node:path";
import { buildAiReviewPrompt } from "./ai/prompt.js";
import { resolveAiProvider } from "./ai/provider.js";
import { buildSafeAiContext } from "./ai/safe-context.js";
import { parseAiReviewResponse } from "./ai/schema.js";
import process from "node:process";
import { buildContextManifest } from "./context.js";
import { collectDiffScope } from "./git.js";
import { evaluatePrivacyFromDiffScope } from "./privacy.js";
import { renderMarkdownReport } from "./report.js";
import { detectSecrets } from "./secrets.js";
import type { AiReviewResult, Finding, ReviewOptions, ReviewResult } from "./types.js";

function isContainedPath(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function resolveOutputPath(out: string | undefined, targetRoot: string): Promise<string> {
  const cwd = process.cwd();
  const cwdInsideTarget = isContainedPath(targetRoot, cwd);
  if (out === undefined && cwdInsideTarget) {
    throw new Error("Refusing to write the default report inside the target project. Pass --out with a path outside the target.");
  }

  const outPath = path.resolve(out ?? path.join(cwd, "orev-review.md"));
  if (isContainedPath(targetRoot, outPath)) {
    throw new Error("Refusing to write the report inside the target project. Pass --out with a path outside the target.");
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  const realTarget = await realpath(targetRoot).catch(() => targetRoot);
  const realOutputParent = await realpath(path.dirname(outPath));
  if (isContainedPath(realTarget, realOutputParent)) {
    throw new Error("Refusing to write the report inside the target project. Pass --out with a path outside the target.");
  }

  const existing = await lstat(outPath).catch(() => undefined);
  if (existing?.isSymbolicLink()) {
    throw new Error("Refusing to write report through a symlink output path.");
  }
  return outPath;
}

async function writeReportFile(outPath: string, markdown: string): Promise<void> {
  const handle = await open(outPath, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
  try {
    await handle.writeFile(markdown, "utf8");
  } finally {
    await handle.close();
  }
}

function buildFindings(result: Omit<ReviewResult, "findings">): Finding[] {
  const findings: Finding[] = [];

  if (!result.diffScope.isGitRepo) {
    findings.push({
      severity: "warning",
      title: "Target is not a git repository",
      evidence: result.diffScope.errors.join(" ") || "No git metadata was found."
    });
  }

  if (result.diffScope.isGitRepo && result.diffScope.diff.trim().length === 0) {
    findings.push({
      severity: "info",
      title: "No current git diff",
      evidence: "Staged and unstaged diffs were both empty."
    });
  }

  if (result.secrets.length > 0) {
    findings.push({
      severity: "blocked",
      title: "Secret gate found added secrets or .env files",
      evidence: `${result.secrets.length} redacted finding(s) are listed in Security Gate.`
    });
  }

  if (result.context.entries.length === 0) {
    findings.push({
      severity: "warning",
      title: "Missing local context",
      evidence: "No CLAUDE.md, AGENTS.md, README*, package.json, pyproject.toml, tsconfig.json, or changed text files were included."
    });
  }

  const diffBytes = Buffer.byteLength(result.diffScope.diff, "utf8");
  if (diffBytes > result.context.maxBytes) {
    findings.push({
      severity: "warning",
      title: "Large diff exceeds context byte budget",
      evidence: `Diff is ${diffBytes} bytes and context max is ${result.context.maxBytes} bytes.`
    });
  }

  const skippedBinary = result.context.skipped.filter((entry) => entry.reason.includes("binary"));
  if (skippedBinary.length > 0) {
    findings.push({
      severity: "info",
      title: "Binary files skipped",
      evidence: `${skippedBinary.length} binary file(s) were excluded from context.`
    });
  }

  const skippedByLimit = result.context.skipped.filter((entry) => entry.reason.startsWith("max "));
  if (skippedByLimit.length > 0) {
    findings.push({
      severity: "info",
      title: "Context files skipped by configured limits",
      evidence: `${skippedByLimit.length} file(s) were skipped by max-files or max-bytes.`
    });
  }

  return findings;
}

async function runAiReview(result: Omit<ReviewResult, "findings" | "ai">, options: NonNullable<ReviewOptions["ai"]>): Promise<AiReviewResult> {
  const privacy = evaluatePrivacyFromDiffScope({
    target: result.target,
    resolvedTarget: result.resolvedTarget,
    diffScope: result.diffScope,
    generatedAt: result.generatedAt
  });
  const safeContext = await buildSafeAiContext({
    root: result.diffScope.root,
    diffScope: privacy.diffScope,
    context: result.context,
    privacyDecision: privacy.overallDecision,
    maxBytes: options.maxAiContextBytes
  });
  const base = {
    requested: true,
    mode: options.mode,
    provider: "anthropic",
    model: options.model,
    privacyDecision: privacy.overallDecision,
    safeContextBytes: safeContext.byteCount,
    safeContextTruncated: safeContext.truncated
  };

  if (privacy.overallDecision !== "ALLOW") {
    return {
      ...base,
      status: "skipped",
      reason: `Privacy decision ${privacy.overallDecision} is not ALLOW; provider was not called.`
    };
  }

  let resolvedProvider;
  try {
    resolvedProvider = resolveAiProvider(options.model, options.provider);
  } catch (error) {
    return {
      ...base,
      status: "failed",
      reason: error instanceof Error ? error.message : String(error)
    };
  }

  try {
    const raw = await resolvedProvider.provider.generateJson({
      model: resolvedProvider.apiModel,
      prompt: buildAiReviewPrompt(safeContext, options.mode),
      maxOutputTokens: options.maxAiOutputTokens,
      timeoutMs: options.aiTimeoutMs
    });
    return {
      ...base,
      status: "success",
      provider: resolvedProvider.providerName,
      model: resolvedProvider.apiModel,
      review: parseAiReviewResponse(raw, options.mode)
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      provider: resolvedProvider.providerName,
      model: resolvedProvider.apiModel,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function runReview(options: ReviewOptions): Promise<{ result: ReviewResult; markdown: string; outPath: string }> {
  const resolvedTarget = path.resolve(options.target);
  const diffScope = await collectDiffScope(resolvedTarget);
  const secrets = detectSecrets(diffScope.diff);
  const context = await buildContextManifest({
    root: diffScope.root,
    changedFiles: diffScope.nameOnly,
    maxFiles: options.maxFiles,
    maxBytes: options.maxBytes,
    includeTests: options.includeTests
  });

  const baseResult: Omit<ReviewResult, "findings"> = {
    target: options.target,
    resolvedTarget,
    diffScope,
    secrets,
    context,
    generatedAt: new Date().toISOString()
  };

  const result: ReviewResult = {
    ...baseResult,
    ...(options.ai?.enabled === true ? { ai: await runAiReview(baseResult, options.ai) } : {}),
    findings: buildFindings(baseResult)
  };
  const markdown = renderMarkdownReport(result);
  const outPath = await resolveOutputPath(options.out, diffScope.root);
  await writeReportFile(outPath, markdown);
  return { result, markdown, outPath };
}
