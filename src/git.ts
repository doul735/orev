import { execFile } from "node:child_process";
import process from "node:process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { DiffScope } from "./types.js";

const execFileAsync = promisify(execFile);

interface CommandResult {
  stdout: string;
  stderr: string;
  ok: boolean;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function runGit(root: string, args: string[]): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: root,
      env: { ...process.env, GIT_EXTERNAL_DIFF: "", GIT_PAGER: "cat" },
      maxBuffer: 20 * 1024 * 1024
    });
    return { stdout, stderr, ok: true };
  } catch (error) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      const withOutput = error as Error & { stdout?: string; stderr?: string };
      return {
        stdout: withOutput.stdout ?? "",
        stderr: withOutput.stderr ?? error.message,
        ok: false
      };
    }
    return { stdout: "", stderr: String(error), ok: false };
  }
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export async function collectDiffScope(target: string): Promise<DiffScope> {
  const resolvedTarget = path.resolve(target);
  const exists = await pathExists(resolvedTarget);
  if (!exists) {
    return {
      isGitRepo: false,
      root: resolvedTarget,
      diff: "",
      stagedDiff: "",
      unstagedDiff: "",
      nameOnly: [],
      stat: "",
      errors: [`Target path does not exist: ${resolvedTarget}`]
    };
  }

  const rootResult = await runGit(resolvedTarget, ["rev-parse", "--show-toplevel"]);
  if (!rootResult.ok) {
    return {
      isGitRepo: false,
      root: resolvedTarget,
      diff: "",
      stagedDiff: "",
      unstagedDiff: "",
      nameOnly: [],
      stat: "",
      errors: ["Target is not a git repository or git metadata is unavailable."]
    };
  }

  const root = rootResult.stdout.trim();
  const safeDiffFlags = ["--no-ext-diff", "--no-textconv"];
  const stagedDiff = await runGit(root, ["diff", ...safeDiffFlags, "--cached"]);
  const unstagedDiff = await runGit(root, ["diff", ...safeDiffFlags]);
  const stagedNames = await runGit(root, ["diff", ...safeDiffFlags, "--cached", "--name-only"]);
  const unstagedNames = await runGit(root, ["diff", ...safeDiffFlags, "--name-only"]);
  const stagedStat = await runGit(root, ["diff", ...safeDiffFlags, "--cached", "--stat"]);
  const unstagedStat = await runGit(root, ["diff", ...safeDiffFlags, "--stat"]);

  const errors = [stagedDiff, unstagedDiff, stagedNames, unstagedNames, stagedStat, unstagedStat]
    .filter((result) => !result.ok)
    .map((result) => result.stderr.trim() || "git command failed");

  return {
    isGitRepo: true,
    root,
    diff: `${stagedDiff.stdout}${unstagedDiff.stdout}`,
    stagedDiff: stagedDiff.stdout,
    unstagedDiff: unstagedDiff.stdout,
    nameOnly: uniqueSorted([...parseLines(stagedNames.stdout), ...parseLines(unstagedNames.stdout)]),
    stat: [stagedStat.stdout.trim(), unstagedStat.stdout.trim()].filter(Boolean).join("\n"),
    errors
  };
}
