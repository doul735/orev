import type {
  AiDimensionSummary,
  AiFinding,
  AiReviewDimension,
  AiReviewRisk,
  AiReviewSeverity,
  AiReviewSuccess,
  PathologyClass,
  PathologyCounts,
  ReviewMode,
  UxFinding,
  UxFindingCategory,
  UxReviewLens,
  UxReviewSuccess
} from "../types.js";
import { containsSecretPattern } from "../secrets.js";

export const aiDimensions: AiReviewDimension[] = [
  "security",
  "correctness",
  "crossFileConsistency",
  "convention",
  "performance",
  "architecture"
];

const risks: AiReviewRisk[] = ["low", "medium", "high", "critical"];
const severities: AiReviewSeverity[] = ["info", "warning", "error", "critical"];
const pathologies: PathologyClass[] = ["Cancer", "Polyp", "Cigarette"];
export const uxLenses: UxReviewLens[] = [
  "userScenario",
  "stateHandling",
  "mobileResponsive",
  "accessibility",
  "edgeCases",
  "featureIntegration",
  "feedbackInteraction"
];
const uxCategories: UxFindingCategory[] = ["quickWin", "major", "niceToHave"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRisk(value: unknown): value is AiReviewRisk {
  return typeof value === "string" && risks.includes(value as AiReviewRisk);
}

function isDimension(value: unknown): value is AiReviewDimension {
  return typeof value === "string" && aiDimensions.includes(value as AiReviewDimension);
}

function isSeverity(value: unknown): value is AiReviewSeverity {
  return typeof value === "string" && severities.includes(value as AiReviewSeverity);
}

function isPathology(value: unknown): value is PathologyClass {
  return typeof value === "string" && pathologies.includes(value as PathologyClass);
}

function pathologyFromSeverity(severity: AiReviewSeverity): PathologyClass {
  if (severity === "critical") {
    return "Cancer";
  }
  if (severity === "error" || severity === "warning") {
    return "Polyp";
  }
  return "Cigarette";
}

function pathologyFromUxCategory(category: UxFindingCategory): PathologyClass {
  return category === "major" ? "Polyp" : "Cigarette";
}

function countsForFindings(findings: Array<{ pathology: PathologyClass }>): PathologyCounts {
  return findings.reduce<PathologyCounts>((counts, finding) => {
    counts[finding.pathology] += 1;
    return counts;
  }, { Cancer: 0, Polyp: 0, Cigarette: 0 });
}

function isUxLens(value: unknown): value is UxReviewLens {
  return typeof value === "string" && uxLenses.includes(value as UxReviewLens);
}

function isUxCategory(value: unknown): value is UxFindingCategory {
  return typeof value === "string" && uxCategories.includes(value as UxFindingCategory);
}

function parseDimension(value: unknown): AiDimensionSummary | undefined {
  if (!isRecord(value) || !isDimension(value.dimension) || !isRisk(value.risk) || !isString(value.summary)) {
    return undefined;
  }
  return {
    dimension: value.dimension,
    risk: value.risk,
    summary: value.summary
  };
}

function parseFinding(value: unknown, allowLegacyPathology: boolean): AiFinding | undefined {
  if (!isRecord(value)
    || !isDimension(value.dimension)
    || !isSeverity(value.severity)
    || !isString(value.title)
    || !isString(value.evidence)
    || !isString(value.recommendation)
    || typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0
    || value.confidence > 1) {
    return undefined;
  }
  if (value.file !== undefined && typeof value.file !== "string") {
    return undefined;
  }
  if (value.line !== undefined && (typeof value.line !== "number" || !Number.isInteger(value.line) || value.line <= 0)) {
    return undefined;
  }
  const pathology = isPathology(value.pathology) ? value.pathology : allowLegacyPathology ? pathologyFromSeverity(value.severity) : undefined;
  if (pathology === undefined) {
    return undefined;
  }
  const blastRadius = isString(value.blastRadius) ? value.blastRadius : allowLegacyPathology ? "Derived from legacy schema v1 severity metadata." : undefined;
  const infectionPath = isString(value.infectionPath) ? value.infectionPath : allowLegacyPathology ? "Legacy schema v1 did not provide infection path details." : undefined;
  const containment = isString(value.containment) ? value.containment : allowLegacyPathology ? value.recommendation : undefined;
  if (blastRadius === undefined || infectionPath === undefined || containment === undefined) {
    return undefined;
  }
  const finding: AiFinding = {
    dimension: value.dimension,
    severity: value.severity,
    pathology,
    title: value.title,
    evidence: value.evidence,
    recommendation: value.recommendation,
    blastRadius,
    infectionPath,
    containment,
    confidence: value.confidence
  };
  if (typeof value.file === "string") {
    finding.file = value.file;
  }
  if (typeof value.line === "number") {
    finding.line = value.line;
  }
  return finding;
}

function parseCodeReview(parsed: unknown): AiReviewSuccess {
  if (!isRecord(parsed) || (parsed.schemaVersion !== 2 && parsed.schemaVersion !== 1) || !isRisk(parsed.overallRisk) || !isString(parsed.summary)) {
    throw new Error("AI response schema mismatch");
  }
  if (!Array.isArray(parsed.dimensions) || parsed.dimensions.length !== aiDimensions.length) {
    throw new Error("AI response must include exactly six dimensions");
  }
  const dimensions = parsed.dimensions.map(parseDimension);
  if (dimensions.some((dimension) => dimension === undefined)) {
    throw new Error("AI response contains an invalid dimension summary");
  }
  const dimensionNames = dimensions.map((dimension) => dimension?.dimension).sort();
  const expectedNames = aiDimensions.slice().sort();
  if (dimensionNames.join("\n") !== expectedNames.join("\n")) {
    throw new Error("AI response dimensions do not match required dimensions");
  }
  if (!Array.isArray(parsed.findings)) {
    throw new Error("AI response findings must be an array");
  }
  const allowLegacyPathology = parsed.schemaVersion === 1;
  const findings = parsed.findings.map((finding) => parseFinding(finding, allowLegacyPathology));
  if (findings.some((finding) => finding === undefined)) {
    throw new Error("AI response contains an invalid finding");
  }
  const typedFindings = findings.filter((finding): finding is AiFinding => finding !== undefined);
  const pathologyCounts = countsForFindings(typedFindings);

  return {
    mode: "code",
    schemaVersion: 2,
    overallRisk: parsed.overallRisk,
    pathologyCounts,
    summary: parsed.summary,
    dimensions: dimensions.filter((dimension): dimension is AiDimensionSummary => dimension !== undefined),
    findings: typedFindings
  };
}

function parseUxFinding(value: unknown, allowLegacyPathology: boolean): UxFinding | undefined {
  if (!isRecord(value)
    || !isUxLens(value.lens)
    || !isUxCategory(value.category)
    || !isString(value.title)
    || !isString(value.current)
    || !isString(value.suggestion)
    || typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence)
    || value.confidence < 0
    || value.confidence > 1) {
    return undefined;
  }
  if (value.file !== undefined && typeof value.file !== "string") {
    return undefined;
  }
  if (value.line !== undefined && (typeof value.line !== "number" || !Number.isInteger(value.line) || value.line <= 0)) {
    return undefined;
  }
  const pathology = isPathology(value.pathology) ? value.pathology : allowLegacyPathology ? pathologyFromUxCategory(value.category) : undefined;
  if (pathology === undefined) {
    return undefined;
  }
  const blastRadius = isString(value.blastRadius) ? value.blastRadius : allowLegacyPathology ? "Derived from legacy schema v1 UX category metadata." : undefined;
  const infectionPath = isString(value.infectionPath) ? value.infectionPath : allowLegacyPathology ? "Legacy schema v1 did not provide infection path details." : undefined;
  const containment = isString(value.containment) ? value.containment : allowLegacyPathology ? value.suggestion : undefined;
  if (blastRadius === undefined || infectionPath === undefined || containment === undefined) {
    return undefined;
  }
  const finding: UxFinding = {
    lens: value.lens,
    category: value.category,
    pathology,
    title: value.title,
    current: value.current,
    suggestion: value.suggestion,
    blastRadius,
    infectionPath,
    containment,
    confidence: value.confidence
  };
  if (typeof value.file === "string") {
    finding.file = value.file;
  }
  if (typeof value.line === "number") {
    finding.line = value.line;
  }
  return finding;
}

function parseUxReview(parsed: unknown): UxReviewSuccess {
  if (!isRecord(parsed) || (parsed.schemaVersion !== 2 && parsed.schemaVersion !== 1) || !isString(parsed.target) || !isString(parsed.summary)) {
    throw new Error("AI UX response schema mismatch");
  }
  if ("dimensions" in parsed || "overallRisk" in parsed) {
    throw new Error("AI UX response schema mismatch");
  }
  if (!Array.isArray(parsed.findings)) {
    throw new Error("AI UX response findings must be an array");
  }
  const allowLegacyPathology = parsed.schemaVersion === 1;
  const findings = parsed.findings.map((finding) => parseUxFinding(finding, allowLegacyPathology));
  if (findings.some((finding) => finding === undefined)) {
    throw new Error("AI UX response contains an invalid finding");
  }
  const typedFindings = findings.filter((finding): finding is UxFinding => finding !== undefined);
  const pathologyCounts = countsForFindings(typedFindings);

  return {
    mode: "ux",
    schemaVersion: 2,
    target: parsed.target,
    pathologyCounts,
    summary: parsed.summary,
    findings: typedFindings
  };
}

export function parseAiReviewResponse(raw: string, mode: ReviewMode = "code"): AiReviewSuccess | UxReviewSuccess {
  if (containsSecretPattern(raw)) {
    throw new Error("AI response contains a raw secret-like value");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI response was not valid JSON: ${message}`);
  }

  return mode === "ux" ? parseUxReview(parsed) : parseCodeReview(parsed);
}
