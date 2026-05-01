import { constants } from "node:fs";
import { lstat, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { collectDiffScope } from "./git.js";
import { detectSecrets } from "./secrets.js";
import type { DiffScope, PrivacyDecision, PrivacyFinding, PrivacyOptions, PrivacyResult, SecretFinding } from "./types.js";

const blockingSecretTypes = new Set([
  ".env file in diff",
  "AWS Access Key",
  "AWS Secret Key",
  "GitHub Personal Access Token",
  "GitHub OAuth Token",
  "GitHub Fine-grained PAT",
  "OpenAI API Key",
  "Anthropic API Key",
  "Stripe Live Secret Key",
  "Stripe Restricted Key",
  "Database URL with credentials",
  "Slack Bot Token",
  "Slack User Token",
  "SendGrid API Key",
  "Private Key"
]);

function isOrevPath(file: string): boolean {
  return file === ".orev" || file.startsWith(".orev/");
}

function diffHeaderPath(line: string, prefix: "--- " | "+++ "): string | undefined {
  if (!line.startsWith(prefix)) {
    return undefined;
  }
  const value = line.slice(prefix.length);
  if (value === "/dev/null") {
    return value;
  }
  if (value.startsWith("a/") || value.startsWith("b/")) {
    return value.slice(2);
  }
  return value;
}

function blockTargetsOrev(block: string[]): boolean {
  for (const line of block) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      if (match?.[1] !== undefined && isOrevPath(match[1])) {
        return true;
      }
      if (match?.[2] !== undefined && isOrevPath(match[2])) {
        return true;
      }
    }
    const oldPath = diffHeaderPath(line, "--- ");
    if (oldPath !== undefined && oldPath !== "/dev/null" && isOrevPath(oldPath)) {
      return true;
    }
    const newPath = diffHeaderPath(line, "+++ ");
    if (newPath !== undefined && newPath !== "/dev/null" && isOrevPath(newPath)) {
      return true;
    }
  }
  return false;
}

function removeOrevDiffBlocks(diff: string): string {
  const kept: string[] = [];
  let current: string[] = [];

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      if (current.length > 0 && !blockTargetsOrev(current)) {
        kept.push(...current);
      }
      current = [line];
      continue;
    }
    current.push(line);
  }

  if (current.length > 0 && !blockTargetsOrev(current)) {
    kept.push(...current);
  }

  return kept.join("\n");
}

function filterPrivacyDiffScope(diffScope: DiffScope): DiffScope {
  return {
    ...diffScope,
    diff: removeOrevDiffBlocks(diffScope.diff),
    stagedDiff: removeOrevDiffBlocks(diffScope.stagedDiff),
    unstagedDiff: removeOrevDiffBlocks(diffScope.unstagedDiff),
    nameOnly: diffScope.nameOnly.filter((file) => !isOrevPath(file))
  };
}

function classifyFinding(finding: SecretFinding): PrivacyDecision {
  if (finding.type === "Private Key") {
    return "BLOCK";
  }
  if (blockingSecretTypes.has(finding.type)) {
    return "BLOCK";
  }
  return "REDACT";
}

function compareDecision(a: PrivacyDecision, b: PrivacyDecision): number {
  const rank: Record<PrivacyDecision, number> = { ALLOW: 0, SUMMARIZE: 1, REDACT: 2, BLOCK: 3 };
  return rank[a] - rank[b];
}

function buildCounts(findings: PrivacyFinding[], overallDecision: PrivacyDecision): Record<PrivacyDecision, number> {
  const counts: Record<PrivacyDecision, number> = { ALLOW: 0, REDACT: 0, SUMMARIZE: 0, BLOCK: 0 };
  if (findings.length === 0) {
    counts[overallDecision] = 1;
    return counts;
  }
  for (const finding of findings) {
    counts[finding.decision] += 1;
  }
  return counts;
}

function buildPrivacyFindings(secrets: SecretFinding[]): PrivacyFinding[] {
  return secrets.map((secret) => ({
    ...secret,
    decision: classifyFinding(secret)
  }));
}

function decideOverall(findings: PrivacyFinding[]): PrivacyDecision {
  return findings.reduce<PrivacyDecision>((current, finding) => (
    compareDecision(finding.decision, current) > 0 ? finding.decision : current
  ), "ALLOW");
}

function renderFinding(finding: PrivacyFinding): string {
  return `- **${finding.decision}** ${finding.type}: \`${finding.file}:${finding.line}\` -> \`${finding.redacted}\``;
}

export function renderPrivacyReport(result: PrivacyResult): string {
  const findings = result.findings.length === 0
    ? "- No privacy findings detected in added diff lines."
    : result.findings.map(renderFinding).join("\n");
  const changedFiles = result.diffScope.nameOnly.length === 0
    ? "- No changed files reported by git."
    : result.diffScope.nameOnly.map((file) => `- \`${file}\``).join("\n");
  const gitNotes = result.diffScope.errors.length === 0
    ? "- None."
    : result.diffScope.errors.map((error) => `- ${error}`).join("\n");

  return `# orev privacy gate report\n\nGenerated: ${result.generatedAt}\n\n## Summary\n\n- Target: \`${result.resolvedTarget}\`\n- Overall decision: **${result.overallDecision}**\n- Changed files scanned: ${result.diffScope.nameOnly.length}\n- Raw secrets: omitted; this report only contains redacted values from deterministic local scanning.\n\n## Counts by decision\n\n- ALLOW: ${result.countsByDecision.ALLOW}\n- REDACT: ${result.countsByDecision.REDACT}\n- SUMMARIZE: ${result.countsByDecision.SUMMARIZE}\n- BLOCK: ${result.countsByDecision.BLOCK}\n\n## Sanitized findings\n\n${findings}\n\n## Diff scope\n\n${changedFiles}\n\n## Git collection notes\n\n${gitNotes}\n\n## Determinism\n\n- Local deterministic MVP only.\n- No LLM calls, Ollama calls, external network calls, or raw secret disclosure.\n- Generated \`.orev\` artifacts are excluded from privacy scanning on rerun.\n`;
}

async function resolvePrivacyOutputPath(out: string | undefined, targetRoot: string): Promise<string> {
  const outPath = path.resolve(out ?? path.join(targetRoot, ".orev", "privacy-report.md"));
  await mkdir(path.dirname(outPath), { recursive: true });
  const existing = await lstat(outPath).catch(() => undefined);
  if (existing?.isSymbolicLink()) {
    throw new Error("Refusing to write privacy report through a symlink output path.");
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

export function evaluatePrivacyFromDiffScope(options: {
  target: string;
  resolvedTarget: string;
  diffScope: DiffScope;
  generatedAt?: string;
}): PrivacyResult {
  const diffScope = filterPrivacyDiffScope(options.diffScope);
  const findings = buildPrivacyFindings(detectSecrets(diffScope.diff));
  const overallDecision = decideOverall(findings);
  return {
    target: options.target,
    resolvedTarget: options.resolvedTarget,
    diffScope,
    findings,
    overallDecision,
    countsByDecision: buildCounts(findings, overallDecision),
    generatedAt: options.generatedAt ?? new Date().toISOString()
  };
}

export async function evaluatePrivacy(options: Pick<PrivacyOptions, "target">): Promise<PrivacyResult> {
  const resolvedTarget = path.resolve(options.target);
  const rawDiffScope = await collectDiffScope(resolvedTarget);
  return evaluatePrivacyFromDiffScope({
    target: options.target,
    resolvedTarget,
    diffScope: rawDiffScope
  });
}

export async function runPrivacyGate(options: PrivacyOptions): Promise<{ result: PrivacyResult; markdown: string; outPath: string }> {
  const resolvedTarget = path.resolve(options.target);
  const rawDiffScope = await collectDiffScope(resolvedTarget);
  const result = evaluatePrivacyFromDiffScope({
    target: options.target,
    resolvedTarget,
    diffScope: rawDiffScope
  });
  const markdown = renderPrivacyReport(result);
  const outPath = await resolvePrivacyOutputPath(options.out, rawDiffScope.root);
  await writeReportFile(outPath, markdown);
  return { result, markdown, outPath };
}
