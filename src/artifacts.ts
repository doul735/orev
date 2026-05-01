import { constants } from "node:fs";
import { lstat, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { buildContextManifest } from "./context.js";
import { collectDiffScope } from "./git.js";
import type { ArtifactOutputFormat, ContextArtifact, DiffScope, DiffScopeArtifact, DiffScopeSummary } from "./types.js";

export interface DiffScopeCommandOptions {
  target: string;
  out?: string;
  format: ArtifactOutputFormat;
  verbose: boolean;
}

export interface ContextCommandOptions {
  target: string;
  out?: string;
  format: ArtifactOutputFormat;
  maxFiles: number;
  maxBytes: number;
  includeTests: boolean;
  verbose: boolean;
}

export interface CommandArtifactResult<TArtifact> {
  artifact: TArtifact;
  outPath?: string;
}

function summarizeDiffScope(diffScope: DiffScope): DiffScopeSummary {
  return {
    isGitRepo: diffScope.isGitRepo,
    root: diffScope.root,
    changedFileCount: diffScope.nameOnly.length,
    nameOnly: diffScope.nameOnly,
    errors: diffScope.errors
  };
}

async function resolveJsonOutputPath(out: string): Promise<string> {
  const outPath = path.resolve(out);
  await mkdir(path.dirname(outPath), { recursive: true });
  const existing = await lstat(outPath).catch(() => undefined);
  if (existing?.isSymbolicLink()) {
    throw new Error("Refusing to write JSON artifact through a symlink output path.");
  }
  return outPath;
}

async function writeJsonArtifact(outPath: string, artifact: unknown): Promise<void> {
  const handle = await open(outPath, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  } finally {
    await handle.close();
  }
}

async function maybeWriteArtifact(out: string | undefined, artifact: unknown): Promise<string | undefined> {
  if (out === undefined) {
    return undefined;
  }
  const outPath = await resolveJsonOutputPath(out);
  await writeJsonArtifact(outPath, artifact);
  return outPath;
}

export function renderDiffScopeSummary(artifact: DiffScopeArtifact, outPath: string | undefined, verbose: boolean): string {
  const lines = [
    `target: ${artifact.resolvedTarget}`,
    `root: ${artifact.diffScope.root}`,
    `git: ${artifact.diffScope.isGitRepo ? "yes" : "no"}`,
    `changed files: ${artifact.diffScope.nameOnly.length}`
  ];
  if (outPath !== undefined) {
    lines.push(`artifact: ${outPath}`);
  }
  if (verbose && artifact.diffScope.errors.length > 0) {
    lines.push(`errors: ${artifact.diffScope.errors.length}`);
  }
  return lines.join("\n");
}

export function renderContextSummary(artifact: ContextArtifact, outPath: string | undefined, verbose: boolean): string {
  const lines = [
    `target: ${artifact.resolvedTarget}`,
    `root: ${artifact.diffScopeSummary.root}`,
    `git: ${artifact.diffScopeSummary.isGitRepo ? "yes" : "no"}`,
    `changed files: ${artifact.diffScopeSummary.changedFileCount}`,
    `context files: ${artifact.context.entries.length}`,
    `skipped files: ${artifact.context.skipped.length}`
  ];
  if (outPath !== undefined) {
    lines.push(`artifact: ${outPath}`);
  }
  if (verbose) {
    lines.push(`context bytes: ${artifact.context.totalBytes}`);
  }
  return lines.join("\n");
}

export function renderJsonSummary(artifact: DiffScopeArtifact | ContextArtifact, outPath: string | undefined): string {
  if (artifact.kind === "diff-scope") {
    return JSON.stringify({
      artifactVersion: artifact.artifactVersion,
      kind: artifact.kind,
      target: artifact.target,
      resolvedTarget: artifact.resolvedTarget,
      generatedAt: artifact.generatedAt,
      summary: summarizeDiffScope(artifact.diffScope),
      outPath
    }, null, 2);
  }
  return JSON.stringify({
    artifactVersion: artifact.artifactVersion,
    kind: artifact.kind,
    target: artifact.target,
    resolvedTarget: artifact.resolvedTarget,
    generatedAt: artifact.generatedAt,
    diffScopeSummary: artifact.diffScopeSummary,
    contextSummary: {
      entries: artifact.context.entries.length,
      skipped: artifact.context.skipped.length,
      totalBytes: artifact.context.totalBytes,
      maxFiles: artifact.context.maxFiles,
      maxBytes: artifact.context.maxBytes
    },
    outPath
  }, null, 2);
}

export async function runDiffScopeCommand(options: DiffScopeCommandOptions): Promise<CommandArtifactResult<DiffScopeArtifact>> {
  const resolvedTarget = path.resolve(options.target);
  const diffScope = await collectDiffScope(resolvedTarget);
  const artifact: DiffScopeArtifact = {
    artifactVersion: 1,
    kind: "diff-scope",
    target: options.target,
    resolvedTarget,
    generatedAt: new Date().toISOString(),
    diffScope
  };
  const outPath = await maybeWriteArtifact(options.out, artifact);
  return outPath === undefined ? { artifact } : { artifact, outPath };
}

export async function runContextCommand(options: ContextCommandOptions): Promise<CommandArtifactResult<ContextArtifact>> {
  const resolvedTarget = path.resolve(options.target);
  const diffScope = await collectDiffScope(resolvedTarget);
  const context = await buildContextManifest({
    root: diffScope.root,
    changedFiles: diffScope.nameOnly,
    maxFiles: options.maxFiles,
    maxBytes: options.maxBytes,
    includeTests: options.includeTests
  });
  const artifact: ContextArtifact = {
    artifactVersion: 1,
    kind: "context",
    target: options.target,
    resolvedTarget,
    generatedAt: new Date().toISOString(),
    diffScopeSummary: summarizeDiffScope(diffScope),
    context
  };
  const outPath = await maybeWriteArtifact(options.out, artifact);
  return outPath === undefined ? { artifact } : { artifact, outPath };
}
