import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { redactSecretsInText } from "../secrets.js";
import type { AiSafeContext, ContextManifest, DiffScope, PrivacyDecision } from "../types.js";

const secretFileNames = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  "credentials.json",
  "secrets.json",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519"
]);

function isContainedPath(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isOrevPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll(path.sep, "/");
  return normalized === ".orev" || normalized.startsWith(".orev/");
}

function isSecretConfigPath(relativePath: string): boolean {
  const normalized = relativePath.replaceAll(path.sep, "/");
  const baseName = path.posix.basename(normalized).toLowerCase();
  return secretFileNames.has(baseName)
    || baseName.startsWith(".env.")
    || /\.(pem|key|p12|pfx)$/i.test(baseName)
    || normalized.toLowerCase().includes("/.ssh/");
}

function isExcludedPath(relativePath: string): boolean {
  return isOrevPath(relativePath) || isSecretConfigPath(relativePath);
}

function appendBounded(parts: string[], value: string, state: { bytes: number; truncated: boolean }, maxBytes: number): void {
  if (state.truncated || value.length === 0) {
    return;
  }
  const valueBytes = Buffer.byteLength(value, "utf8");
  if (state.bytes + valueBytes <= maxBytes) {
    parts.push(value);
    state.bytes += valueBytes;
    return;
  }
  const remaining = maxBytes - state.bytes;
  if (remaining > 0) {
    parts.push(Buffer.from(value, "utf8").subarray(0, remaining).toString("utf8"));
    state.bytes = maxBytes;
  }
  state.truncated = true;
}

async function readSafeFile(root: string, relativePath: string): Promise<string | undefined> {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(normalized) || normalized.startsWith("..") || isExcludedPath(normalized)) {
    return undefined;
  }
  const absolutePath = path.join(root, normalized);
  const linkInfo = await lstat(absolutePath).catch(() => undefined);
  if (linkInfo === undefined || linkInfo.isSymbolicLink()) {
    return undefined;
  }
  const realRoot = await realpath(root).catch(() => root);
  const realFile = await realpath(absolutePath).catch(() => undefined);
  if (realFile === undefined || !isContainedPath(realRoot, realFile)) {
    return undefined;
  }
  const info = await stat(absolutePath).catch(() => undefined);
  if (info === undefined || !info.isFile()) {
    return undefined;
  }
  return readFile(absolutePath, "utf8").catch(() => undefined);
}

export async function buildSafeAiContext(options: {
  root: string;
  diffScope: DiffScope;
  context: ContextManifest;
  privacyDecision: PrivacyDecision;
  maxBytes: number;
}): Promise<AiSafeContext> {
  const parts: string[] = [];
  const state = { bytes: 0, truncated: false };
  const changedFiles = options.diffScope.nameOnly
    .filter((file) => !isExcludedPath(file))
    .sort((a, b) => a.localeCompare(b));
  const contextEntries = options.context.entries
    .filter((entry) => !isExcludedPath(entry.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  appendBounded(parts, `# orev AI safe context\n\n`, state, options.maxBytes);
  appendBounded(parts, `## Changed files\n${changedFiles.map((file) => `- ${redactSecretsInText(file)}`).join("\n") || "- None"}\n\n`, state, options.maxBytes);
  appendBounded(parts, `## Git stat\n\`\`\`text\n${redactSecretsInText(options.diffScope.stat.trim() || "No git diff stat available.")}\n\`\`\`\n\n`, state, options.maxBytes);
  if (options.privacyDecision === "ALLOW") {
    appendBounded(parts, `## Diff\n\`\`\`diff\n${redactSecretsInText(options.diffScope.diff)}\n\`\`\`\n\n`, state, options.maxBytes);
  } else {
    appendBounded(parts, `## Diff\n- Omitted because privacy decision is ${options.privacyDecision}.\n\n`, state, options.maxBytes);
  }
  appendBounded(parts, `## Context manifest\n${contextEntries.map((entry) => redactSecretsInText(`- ${entry.path} (${entry.bytes} bytes, ${entry.reason})`)).join("\n") || "- None"}\n\n`, state, options.maxBytes);

  const includedFiles: string[] = [];
  if (options.privacyDecision === "ALLOW") {
    appendBounded(parts, `## Selected file contents\n`, state, options.maxBytes);
    for (const entry of contextEntries) {
      if (state.truncated) {
        break;
      }
      const content = await readSafeFile(options.root, entry.path);
      if (content === undefined) {
        continue;
      }
      const section = redactSecretsInText(`\n### ${entry.path}\n\`\`\`text\n${content}\n\`\`\`\n`);
      appendBounded(parts, section, state, options.maxBytes);
      if (!state.truncated) {
        includedFiles.push(entry.path);
      }
    }
  } else {
    appendBounded(parts, `## Selected file contents\n- Omitted because privacy decision is ${options.privacyDecision}.\n`, state, options.maxBytes);
  }

  return {
    text: parts.join(""),
    byteCount: Buffer.byteLength(parts.join(""), "utf8"),
    truncated: state.truncated,
    includedFiles
  };
}
