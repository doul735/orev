import type { AiFinding, AiReviewResult, PathologyClass, ReviewResult, SecretFinding, UxFinding } from "./types.js";

function bullet(value: string): string {
  return `- ${value}`;
}

function formatSecret(secret: SecretFinding): string {
  return `- ${secret.type}: \`${secret.file}:${secret.line}\` -> \`${secret.redacted}\``;
}

function formatList(values: string[], empty: string): string {
  return values.length === 0 ? bullet(empty) : values.map(bullet).join("\n");
}

function formatUxLocation(file: string | undefined, line: number | undefined): string {
  if (file === undefined) {
    return "제공된 컨텍스트 기준 위치 없음";
  }
  return `\`${file}${line === undefined ? "" : `:${line}`}\``;
}

const pathologies: PathologyClass[] = ["Cancer", "Polyp", "Cigarette"];

function renderPathologySummary(ai: AiReviewResult): string {
  const counts = ai.review?.pathologyCounts ?? { Cancer: 0, Polyp: 0, Cigarette: 0 };
  return [`- Cancer: ${counts.Cancer}`, `- Polyp: ${counts.Polyp}`, `- Cigarette: ${counts.Cigarette}`].join("\n");
}

function renderUxPathologyItems(findings: UxFinding[]): string {
  if (findings.length === 0) {
    return "- 없음";
  }
  return findings.map((finding) => {
    const location = formatUxLocation(finding.file, finding.line);
    return `- **${finding.title}**\n  - 관점: ${finding.lens}\n  - 노력 메타데이터: ${finding.category}\n  - 현재: ${finding.current}\n  - 제안: ${finding.suggestion}\n  - Blast radius: ${finding.blastRadius}\n  - Infection path: ${finding.infectionPath}\n  - Containment: ${finding.containment}\n  - 위치: ${location}\n  - 신뢰도: ${finding.confidence}`;
  }).join("\n");
}

function renderCodePathologyItems(findings: AiFinding[]): string {
  if (findings.length === 0) {
    return "- 없음";
  }
  return findings.map((finding) => {
    const location = formatUxLocation(finding.file, finding.line);
    return `- **${finding.title}**\n  - 차원: ${finding.dimension}\n  - Severity metadata: ${finding.severity}\n  - Evidence: ${finding.evidence}\n  - Recommendation: ${finding.recommendation}\n  - Blast radius: ${finding.blastRadius}\n  - Infection path: ${finding.infectionPath}\n  - Containment: ${finding.containment}\n  - 위치: ${location}\n  - 신뢰도: ${finding.confidence}`;
  }).join("\n");
}

function renderPathologySections(ai: AiReviewResult): string {
  if (ai.review === undefined) {
    return pathologies.map((pathology) => `### ${pathology}\n\n- 없음`).join("\n\n");
  }
  const { review } = ai;
  if (review.mode === "ux") {
    return pathologies
      .map((pathology) => `### ${pathology}\n\n${renderUxPathologyItems(review.findings.filter((finding) => finding.pathology === pathology))}`)
      .join("\n\n");
  }
  return pathologies
    .map((pathology) => `### ${pathology}\n\n${renderCodePathologyItems(review.findings.filter((finding) => finding.pathology === pathology))}`)
    .join("\n\n");
}

function renderUxAiSection(ai: AiReviewResult): string {
  const metadata = [
    `- Status: ${ai.status}`,
    `- Provider: ${ai.provider}`,
    `- Model: ${ai.model}`,
    `- Mode: ${ai.mode}`,
    `- Privacy decision: ${ai.privacyDecision}`,
    `- Safe context: ${ai.safeContextBytes} bytes, truncated=${ai.safeContextTruncated ? "yes" : "no"}`
  ].join("\n");
  if (ai.status !== "success" || ai.review?.mode !== "ux") {
    return `\n## 기획 리뷰: UX mode\n\n${metadata}\n- Reason: ${ai.reason ?? "AI UX review did not complete."}\n\nNo UX findings were added.\n`;
  }
  return `\n## 기획 리뷰: ${ai.review.target}\n\n${metadata}\n\n### 요약\n\n${ai.review.summary}\n\n### Pathology Summary\n\n${renderPathologySummary(ai)}\n\n${renderPathologySections(ai)}\n`;
}

function renderAiSection(ai: AiReviewResult | undefined): string {
  if (ai === undefined || !ai.requested) {
    return "";
  }
  if (ai.mode === "ux") {
    return renderUxAiSection(ai);
  }
  const metadata = [
    `- Status: ${ai.status}`,
    `- Provider: ${ai.provider}`,
    `- Model: ${ai.model}`,
    `- Mode: ${ai.mode}`,
    `- Privacy decision: ${ai.privacyDecision}`,
    `- Safe context: ${ai.safeContextBytes} bytes, truncated=${ai.safeContextTruncated ? "yes" : "no"}`
  ].join("\n");
  if (ai.status !== "success" || ai.review?.mode !== "code") {
    return `\n## AI Verified Review\n\n${metadata}\n- Reason: ${ai.reason ?? "AI review did not complete."}\n\nNo AI findings were added.\n`;
  }
  const dimensions = ai.review.dimensions
    .map((dimension) => `- **${dimension.dimension}** (${dimension.risk}): ${dimension.summary}`)
    .join("\n");
  return `\n## AI Verified Review\n\n${metadata}\n- Overall risk metadata: ${ai.review.overallRisk}\n- Summary: ${ai.review.summary}\n\n### Pathology Summary\n\n${renderPathologySummary(ai)}\n\n${renderPathologySections(ai)}\n\n### Dimension summaries\n\n${dimensions}\n`;
}

export function renderMarkdownReport(result: ReviewResult): string {
  const diffStatus = result.diffScope.isGitRepo
    ? `${result.diffScope.nameOnly.length} changed file(s)`
    : "not a git target";
  const secretStatus = result.secrets.length > 0 ? `BLOCKED (${result.secrets.length} finding(s))` : "clean";
  const stat = result.diffScope.stat.trim().length > 0 ? result.diffScope.stat.trim() : "No git diff stat available.";
  const changedFiles = formatList(result.diffScope.nameOnly, "No changed files reported by git.");
  const contextEntries = result.context.entries.length === 0
    ? "- No local context files included."
    : result.context.entries.map((entry) => `- \`${entry.path}\` (${entry.bytes} bytes, ${entry.reason})`).join("\n");
  const skippedEntries = result.context.skipped.length === 0
    ? "- None."
    : result.context.skipped.map((entry) => `- \`${entry.path}\` - ${entry.reason}`).join("\n");
  const findings = result.findings.length === 0
    ? "- No deterministic MVP findings."
    : result.findings.map((finding) => `- **${finding.severity.toUpperCase()}** ${finding.title}: ${finding.evidence}`).join("\n");
  const secrets = result.secrets.length === 0 ? "- No secrets detected on added diff lines." : result.secrets.map(formatSecret).join("\n");
  const gitErrors = result.diffScope.errors.length === 0 ? "- None." : result.diffScope.errors.map(bullet).join("\n");

  const reviewMode = result.ai?.requested === true
    ? `deterministic MVP checks plus opt-in AI ${result.ai.mode} review.`
    : "deterministic MVP checks only; no semantic LLM code review was run.";
  const skippedMvp = result.ai?.requested === true
    ? "- No auto-fix, auto-merge, GitHub integration, watcher, daemon, or local service.\n- No global blind secret scan; secret detection is scoped to added git diff lines and .env files in the diff."
    : "- No LLM semantic review or unverifiable code-quality claims.\n- No auto-fix, auto-merge, GitHub integration, watcher, daemon, or local service.\n- No global blind secret scan; secret detection is scoped to added git diff lines and .env files in the diff.";

  return `# orev review report\n\nGenerated: ${result.generatedAt}\n\n## Summary\n\n- Target: \`${result.resolvedTarget}\`\n- Diff scope: ${diffStatus}\n- Security gate: ${secretStatus}\n- Context manifest: ${result.context.entries.length} file(s), ${result.context.totalBytes}/${result.context.maxBytes} bytes\n- Review mode: ${reviewMode}\n\n## Security Gate\n\n${secrets}\n\n## Diff Scope\n\n### Changed files\n\n${changedFiles}\n\n### Git stat\n\n\`\`\`text\n${stat}\n\`\`\`\n\n### Git collection notes\n\n${gitErrors}\n\n## Context Manifest\n\n### Included\n\n${contextEntries}\n\n### Skipped\n\n${skippedEntries}\n\n## Findings\n\n${findings}\n${renderAiSection(result.ai)}\n## Skipped In MVP\n\n${skippedMvp}\n`;
}
