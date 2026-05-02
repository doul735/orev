export type OutputFormat = "markdown";

export type ArtifactOutputFormat = "summary" | "json";

export type PrivacyDecision = "ALLOW" | "REDACT" | "SUMMARIZE" | "BLOCK";

export type AiReviewDimension = "security" | "correctness" | "crossFileConsistency" | "convention" | "performance" | "architecture";

export type ReviewMode = "code" | "ux";

export type AiReviewRisk = "low" | "medium" | "high" | "critical";

export type AiReviewSeverity = "info" | "warning" | "error" | "critical";

export type UxReviewLens = "userScenario" | "stateHandling" | "mobileResponsive" | "accessibility" | "edgeCases" | "featureIntegration" | "feedbackInteraction";

export type UxFindingCategory = "quickWin" | "major" | "niceToHave";

export type PathologyClass = "Cancer" | "Polyp" | "Cigarette";

export interface PathologyCounts {
  Cancer: number;
  Polyp: number;
  Cigarette: number;
}

export interface AiProvider {
  readonly name: string;
  generateJson(request: AiProviderRequest): Promise<string>;
}

export interface AiProviderRequest {
  model: string;
  prompt: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface AiOptions {
  enabled: boolean;
  mode: ReviewMode;
  model: string;
  maxAiContextBytes: number;
  maxAiOutputTokens: number;
  aiTimeoutMs: number;
  /**
   * @deprecated Direct provider injection is experimental/self-hosted. Production reviews run via OMO.
   */
  provider?: AiProvider;
}

export interface ReviewOptions {
  target: string;
  out?: string;
  format: OutputFormat;
  maxFiles: number;
  maxBytes: number;
  includeTests: boolean;
  failOnSecrets: boolean;
  verbose: boolean;
  ai?: AiOptions;
}

export interface AiSafeContext {
  text: string;
  byteCount: number;
  truncated: boolean;
  includedFiles: string[];
}

export interface AiDimensionSummary {
  dimension: AiReviewDimension;
  risk: AiReviewRisk;
  summary: string;
}

export interface AiFinding {
  dimension: AiReviewDimension;
  severity: AiReviewSeverity;
  pathology: PathologyClass;
  title: string;
  evidence: string;
  recommendation: string;
  blastRadius: string;
  infectionPath: string;
  containment: string;
  confidence: number;
  file?: string;
  line?: number;
}

export interface AiReviewSuccess {
  mode: "code";
  schemaVersion: 2;
  overallRisk: AiReviewRisk;
  pathologyCounts: PathologyCounts;
  summary: string;
  dimensions: AiDimensionSummary[];
  findings: AiFinding[];
}

export interface UxFinding {
  lens: UxReviewLens;
  category: UxFindingCategory;
  pathology: PathologyClass;
  title: string;
  current: string;
  suggestion: string;
  blastRadius: string;
  infectionPath: string;
  containment: string;
  confidence: number;
  file?: string;
  line?: number;
}

export interface UxReviewSuccess {
  mode: "ux";
  schemaVersion: 2;
  target: string;
  pathologyCounts: PathologyCounts;
  summary: string;
  findings: UxFinding[];
}

export type AiReviewSuccessResult = AiReviewSuccess | UxReviewSuccess;

export type AiReviewStatus = "success" | "skipped" | "failed";

export interface AiReviewResult {
  requested: boolean;
  mode: ReviewMode;
  status: AiReviewStatus;
  provider: string;
  model: string;
  privacyDecision: PrivacyDecision;
  safeContextBytes: number;
  safeContextTruncated: boolean;
  reason?: string;
  review?: AiReviewSuccessResult;
}

export interface PrivacyOptions {
  target: string;
  out?: string;
  format: OutputFormat;
  failOnBlock: boolean;
  verbose: boolean;
}

export interface DiffScope {
  isGitRepo: boolean;
  root: string;
  diff: string;
  stagedDiff: string;
  unstagedDiff: string;
  nameOnly: string[];
  stat: string;
  errors: string[];
}

export interface SecretFinding {
  type: string;
  file: string;
  line: number;
  redacted: string;
}

export interface PrivacyFinding extends SecretFinding {
  decision: PrivacyDecision;
}

export interface PrivacyResult {
  target: string;
  resolvedTarget: string;
  diffScope: DiffScope;
  findings: PrivacyFinding[];
  overallDecision: PrivacyDecision;
  countsByDecision: Record<PrivacyDecision, number>;
  generatedAt: string;
}

export interface ContextEntry {
  path: string;
  bytes: number;
  reason: string;
}

export interface SkippedEntry {
  path: string;
  reason: string;
}

export interface ContextManifest {
  entries: ContextEntry[];
  skipped: SkippedEntry[];
  totalBytes: number;
  maxFiles: number;
  maxBytes: number;
}

export interface Finding {
  severity: "info" | "warning" | "blocked";
  title: string;
  evidence: string;
}

export interface ReviewResult {
  target: string;
  resolvedTarget: string;
  diffScope: DiffScope;
  secrets: SecretFinding[];
  context: ContextManifest;
  findings: Finding[];
  ai?: AiReviewResult;
  generatedAt: string;
}

export interface DiffScopeArtifact {
  artifactVersion: 1;
  kind: "diff-scope";
  target: string;
  resolvedTarget: string;
  generatedAt: string;
  diffScope: DiffScope;
}

export interface DiffScopeSummary {
  isGitRepo: boolean;
  root: string;
  changedFileCount: number;
  nameOnly: string[];
  errors: string[];
}

export interface ContextArtifact {
  artifactVersion: 1;
  kind: "context";
  target: string;
  resolvedTarget: string;
  generatedAt: string;
  diffScopeSummary: DiffScopeSummary;
  context: ContextManifest;
}
