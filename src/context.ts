import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { ContextEntry, ContextManifest, SkippedEntry } from "./types.js";

const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", ".orev"]);
const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".tgz",
  ".wasm", ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".mov", ".sqlite", ".db"
]);
const metadataNames = new Set(["CLAUDE.md", "AGENTS.md", "package.json", "pyproject.toml", "tsconfig.json"]);

export interface ContextOptions {
  root: string;
  changedFiles: string[];
  maxFiles: number;
  maxBytes: number;
  includeTests: boolean;
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function isIgnoredPath(relativePath: string): string | undefined {
  const parts = relativePath.split(/[\\/]+/).filter(Boolean);
  const ignored = parts.find((part) => ignoredDirectories.has(part));
  return ignored ? `ignored directory: ${ignored}` : undefined;
}

function isTestPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll(path.sep, "/");
  return /(^|\/)(test|tests|__tests__)(\/|$)/i.test(normalized) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(normalized);
}

function looksBinaryByName(relativePath: string): boolean {
  return binaryExtensions.has(path.extname(relativePath).toLowerCase());
}

function isBinaryBuffer(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return true;
  }
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }
  return sample.length > 0 && suspicious / sample.length > 0.3;
}

async function readRootMetadata(root: string): Promise<string[]> {
  const names = await readdir(root).catch(() => []);
  return names
    .filter((name) => metadataNames.has(name) || /^README(?:\..*)?$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

async function maybeAddCandidate(candidates: Map<string, string>, relativePath: string, reason: string): Promise<void> {
  if (!candidates.has(relativePath)) {
    candidates.set(relativePath, reason);
  }
}

function isContainedPath(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function buildContextManifest(options: ContextOptions): Promise<ContextManifest> {
  const entries: ContextEntry[] = [];
  const skipped: SkippedEntry[] = [];
  const candidates = new Map<string, string>();

  for (const file of await readRootMetadata(options.root)) {
    await maybeAddCandidate(candidates, file, "root project context");
  }

  for (const changed of options.changedFiles.slice().sort((a, b) => a.localeCompare(b))) {
    await maybeAddCandidate(candidates, changed, "changed file");
  }

  const realRoot = await realpath(options.root).catch(() => options.root);
  let totalBytes = 0;
  for (const [relativePath, reason] of Array.from(candidates.entries())) {
    const normalizedRelative = path.normalize(relativePath);
    if (path.isAbsolute(normalizedRelative) || normalizedRelative.startsWith("..")) {
      skipped.push({ path: relativePath, reason: "path escapes target root" });
      continue;
    }

    const ignoredReason = isIgnoredPath(normalizedRelative);
    if (ignoredReason) {
      skipped.push({ path: relativePath, reason: ignoredReason });
      continue;
    }

    if (!options.includeTests && isTestPath(normalizedRelative)) {
      skipped.push({ path: relativePath, reason: "test file skipped; pass --include-tests to include" });
      continue;
    }

    if (looksBinaryByName(normalizedRelative)) {
      skipped.push({ path: relativePath, reason: "binary file skipped" });
      continue;
    }

    const absolutePath = path.join(options.root, normalizedRelative);
    if (!(await exists(absolutePath))) {
      skipped.push({ path: relativePath, reason: "file no longer exists" });
      continue;
    }

    const linkInfo = await lstat(absolutePath);
    if (linkInfo.isSymbolicLink()) {
      skipped.push({ path: relativePath, reason: "symlink skipped" });
      continue;
    }

    const realFile = await realpath(absolutePath);
    if (!isContainedPath(realRoot, realFile)) {
      skipped.push({ path: relativePath, reason: "real path escapes target root" });
      continue;
    }

    const info = await stat(absolutePath);
    if (!info.isFile()) {
      skipped.push({ path: relativePath, reason: "not a regular file" });
      continue;
    }

    const buffer = await readFile(absolutePath);
    if (isBinaryBuffer(buffer)) {
      skipped.push({ path: relativePath, reason: "binary file skipped" });
      continue;
    }

    if (entries.length >= options.maxFiles) {
      skipped.push({ path: relativePath, reason: `max files reached (${options.maxFiles})` });
      continue;
    }

    if (totalBytes + buffer.byteLength > options.maxBytes) {
      skipped.push({ path: relativePath, reason: `max bytes reached (${options.maxBytes})` });
      continue;
    }

    entries.push({ path: relativePath, bytes: buffer.byteLength, reason });
    totalBytes += buffer.byteLength;
  }

  return {
    entries,
    skipped,
    totalBytes,
    maxFiles: options.maxFiles,
    maxBytes: options.maxBytes
  };
}
