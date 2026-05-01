import type { AiReviewResult, ReviewResult, SecretFinding, UxFindingCategory } from "./types.js";

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

function renderUxItems(ai: AiReviewResult, category: UxFindingCategory): string {
  if (ai.review?.mode !== "ux") {
    return "- 없음";
  }
  const findings = ai.review.findings.filter((finding) => finding.category === category);
  if (findings.length === 0) {
    return "- 없음";
  }
  return findings.map((finding) => {
    const location = formatUxLocation(finding.file, finding.line);
    return `- **${finding.title}**\n  - 관점: ${finding.lens}\n  - 현재: ${finding.current}\n  - 제안: ${finding.suggestion}\n  - 위치: ${location}\n  - 신뢰도: ${finding.confidence}`;
  }).join("\n");
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
  const counts = {
    quickWin: ai.review.findings.filter((finding) => finding.category === "quickWin").length,
    major: ai.review.findings.filter((finding) => finding.category === "major").length,
    niceToHave: ai.review.findings.filter((finding) => finding.category === "niceToHave").length
  };
  return `\n## 기획 리뷰: ${ai.review.target}\n\n${metadata}\n\n### 요약\n\n${ai.review.summary}\n\n- Quick Win: ${counts.quickWin}\n- Major: ${counts.major}\n- Nice-to-have: ${counts.niceToHave}\n\n### 🟢 Quick Win\n\n${renderUxItems(ai, "quickWin")}\n\n### 🟡 Major\n\n${renderUxItems(ai, "major")}\n\n### 🔵 Nice-to-have\n\n${renderUxItems(ai, "niceToHave")}\n`;
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
  const findings = ai.review.findings.length === 0
    ? "- No AI findings returned."
    : ai.review.findings.map((finding) => {
      const location = finding.file === undefined ? "" : ` (\`${finding.file}${finding.line === undefined ? "" : `:${finding.line}`}\`)`;
      return `- **${finding.severity.toUpperCase()}** ${finding.dimension}${location}: ${finding.title} — ${finding.evidence} Recommendation: ${finding.recommendation} Confidence: ${finding.confidence}`;
    }).join("\n");
  return `\n## AI Verified Review\n\n${metadata}\n- Overall risk: ${ai.review.overallRisk}\n- Summary: ${ai.review.summary}\n\n### Dimension summaries\n\n${dimensions}\n\n### AI findings\n\n${findings}\n`;
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
