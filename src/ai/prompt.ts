import type { AiSafeContext, ReviewMode } from "../types.js";

function buildCodeReviewPrompt(context: AiSafeContext): string {
  return `You are orev AI Verified Review. Return only strict JSON, with no markdown fences or prose.

Schema:
{
  "schemaVersion": 1,
  "overallRisk": "low" | "medium" | "high" | "critical",
  "summary": string,
  "dimensions": [
    { "dimension": "security", "risk": "low" | "medium" | "high" | "critical", "summary": string },
    { "dimension": "correctness", "risk": "low" | "medium" | "high" | "critical", "summary": string },
    { "dimension": "crossFileConsistency", "risk": "low" | "medium" | "high" | "critical", "summary": string },
    { "dimension": "convention", "risk": "low" | "medium" | "high" | "critical", "summary": string },
    { "dimension": "performance", "risk": "low" | "medium" | "high" | "critical", "summary": string },
    { "dimension": "architecture", "risk": "low" | "medium" | "high" | "critical", "summary": string }
  ],
  "findings": [
    {
      "dimension": "security" | "correctness" | "crossFileConsistency" | "convention" | "performance" | "architecture",
      "severity": "info" | "warning" | "error" | "critical",
      "title": string,
      "evidence": string,
      "recommendation": string,
      "confidence": number,
      "file": string optional,
      "line": number optional
    }
  ]
}

Rules:
- Do not invent files, lines, or behavior not supported by the provided context.
- Keep evidence specific and quote only small snippets.
- Use an empty findings array when no supported finding exists.
- Include exactly the six dimensions listed above.

Safe context metadata: ${context.byteCount} bytes, truncated=${context.truncated ? "true" : "false"}.

${context.text}`;
}

function buildUxReviewPrompt(context: AiSafeContext): string {
  return `You are orev UX Planning Review. Return only strict JSON, with no markdown fences or prose.

Schema:
{
  "schemaVersion": 1,
  "target": string,
  "summary": string,
  "findings": [
    {
      "lens": "userScenario" | "stateHandling" | "mobileResponsive" | "accessibility" | "edgeCases" | "featureIntegration" | "feedbackInteraction",
      "category": "quickWin" | "major" | "niceToHave",
      "title": string,
      "current": string,
      "suggestion": string,
      "confidence": number,
      "file": string optional,
      "line": number optional
    }
  ]
}

UX lenses:
- userScenario: user goal, flow clarity, and scenario completeness.
- stateHandling: loading, empty, error, disabled, optimistic, and success states.
- mobileResponsive: small-screen layout, touch targets, and responsive behavior.
- accessibility: keyboard use, labels, contrast, focus, and assistive technology semantics.
- edgeCases: boundary conditions, long content, missing data, slow or failed dependencies.
- featureIntegration: fit with surrounding product flows, navigation, settings, and permissions.
- feedbackInteraction: confirmations, validation, progress, recovery, and user-facing feedback.

Finding categories:
- quickWin: small, low-risk UX improvement with clear value.
- major: important UX gap that can block task completion, trust, comprehension, or adoption.
- niceToHave: polish or enhancement that is useful but not blocking.

Rules:
- Focus on planning and UX gaps only; do not perform security, code quality, architecture, or style review.
- Do not invent files, lines, screens, or behavior not supported by the provided context.
- Use an empty findings array when no supported UX finding exists.
- Every finding must include one of the seven lenses and one of the three categories.
- Keep current and suggestion concrete enough to paste into a UX review report.

Safe context metadata: ${context.byteCount} bytes, truncated=${context.truncated ? "true" : "false"}.

${context.text}`;
}

export function buildAiReviewPrompt(context: AiSafeContext, mode: ReviewMode = "code"): string {
  return mode === "ux" ? buildUxReviewPrompt(context) : buildCodeReviewPrompt(context);
}
