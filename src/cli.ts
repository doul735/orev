#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import {
  renderContextSummary,
  renderDiffScopeSummary,
  renderJsonSummary,
  runContextCommand,
  runDiffScopeCommand
} from "./artifacts.js";
import { runPrivacyGate } from "./privacy.js";
import { runReview } from "./review.js";
import type { ArtifactOutputFormat, OutputFormat, PrivacyOptions, ReviewMode, ReviewOptions } from "./types.js";

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed.toString() !== value) {
    throw new InvalidArgumentError("must be a positive integer");
  }
  return parsed;
}

function parseFormat(value: string): OutputFormat {
  if (value !== "markdown") {
    throw new InvalidArgumentError("only markdown is supported in the MVP");
  }
  return value;
}

function parseArtifactFormat(value: string): ArtifactOutputFormat {
  if (value !== "summary" && value !== "json") {
    throw new InvalidArgumentError("supported formats are summary and json");
  }
  return value;
}

function parseReviewMode(value: string): ReviewMode {
  if (value !== "code" && value !== "ux") {
    throw new InvalidArgumentError("supported modes are code and ux");
  }
  return value;
}

interface CommanderOptions {
  out?: string;
  format: OutputFormat;
  maxFiles: number;
  maxBytes: number;
  includeTests: boolean;
  failOnSecrets: boolean;
  verbose: boolean;
  /**
   * @deprecated Direct provider review is experimental/self-hosted. Production reviews run via OMO.
   */
  ai: boolean;
  mode: ReviewMode;
  model: string;
  maxAiContextBytes: number;
  maxAiOutputTokens: number;
  aiTimeoutMs: number;
}

interface PrivacyCommanderOptions {
  out?: string;
  format: OutputFormat;
  failOnBlock: boolean;
  verbose: boolean;
}

interface DiffScopeCommanderOptions {
  out?: string;
  format: ArtifactOutputFormat;
  verbose: boolean;
}

interface ContextCommanderOptions {
  out?: string;
  format: ArtifactOutputFormat;
  maxFiles: number;
  maxBytes: number;
  includeTests: boolean;
  verbose: boolean;
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name("orev")
    .description("Deterministic diff-scoped review report CLI MVP")
    .version("0.1.0");

  program
    .command("diff-scope")
    .argument("[target]", "target project path", ".")
    .option("--out <path>", "JSON artifact output path")
    .option("--format <format>", "stdout format", parseArtifactFormat, "summary")
    .option("--verbose", "print extra execution details", false)
    .action(async (target: string, commandOptions: DiffScopeCommanderOptions) => {
      const { artifact, outPath } = await runDiffScopeCommand({
        target,
        format: commandOptions.format,
        verbose: commandOptions.verbose,
        ...(commandOptions.out === undefined ? {} : { out: commandOptions.out })
      });
      console.log(commandOptions.format === "json"
        ? renderJsonSummary(artifact, outPath)
        : renderDiffScopeSummary(artifact, outPath, commandOptions.verbose));
    });

  program
    .command("context")
    .argument("[target]", "target project path", ".")
    .option("--out <path>", "JSON artifact output path")
    .option("--format <format>", "stdout format", parseArtifactFormat, "summary")
    .option("--max-files <number>", "maximum context files", parsePositiveInteger, 20)
    .option("--max-bytes <number>", "maximum context bytes", parsePositiveInteger, 200000)
    .option("--include-tests", "include test files in context manifest", false)
    .option("--verbose", "print extra execution details", false)
    .action(async (target: string, commandOptions: ContextCommanderOptions) => {
      const { artifact, outPath } = await runContextCommand({
        target,
        format: commandOptions.format,
        maxFiles: commandOptions.maxFiles,
        maxBytes: commandOptions.maxBytes,
        includeTests: commandOptions.includeTests,
        verbose: commandOptions.verbose,
        ...(commandOptions.out === undefined ? {} : { out: commandOptions.out })
      });
      console.log(commandOptions.format === "json"
        ? renderJsonSummary(artifact, outPath)
        : renderContextSummary(artifact, outPath, commandOptions.verbose));
    });

  program
    .command("review")
    .argument("[target]", "target project path", ".")
    .option("--out <path>", "Markdown report output path")
    .option("--format <format>", "output format", parseFormat, "markdown")
    .option("--max-files <number>", "maximum context files", parsePositiveInteger, 20)
    .option("--max-bytes <number>", "maximum context bytes", parsePositiveInteger, 200000)
    .option("--include-tests", "include test files in context manifest", false)
    .option("--fail-on-secrets", "exit with code 2 when secrets are detected", true)
    .option("--no-fail-on-secrets", "write a blocked report but exit 0 when secrets are detected")
    .option("--ai", "experimental/self-hosted direct provider review after privacy gate allows it", false)
    .option("--mode <mode>", "AI review mode: code or ux", parseReviewMode, "code")
    .option("--model <model>", "AI model alias or provider model id", "claude")
    .option("--max-ai-context-bytes <number>", "maximum bytes sent to the AI provider", parsePositiveInteger, 120000)
    .option("--max-ai-output-tokens <number>", "maximum AI output tokens", parsePositiveInteger, 3000)
    .option("--ai-timeout-ms <number>", "AI provider timeout in milliseconds", parsePositiveInteger, 60000)
    .option("--verbose", "print extra execution details", false)
    .action(async (target: string, commandOptions: CommanderOptions) => {
      const reviewOptions: ReviewOptions = {
        target,
        format: commandOptions.format,
        maxFiles: commandOptions.maxFiles,
        maxBytes: commandOptions.maxBytes,
        includeTests: commandOptions.includeTests,
        failOnSecrets: commandOptions.failOnSecrets,
        verbose: commandOptions.verbose,
        ai: {
          enabled: commandOptions.ai,
          mode: commandOptions.mode,
          model: commandOptions.model,
          maxAiContextBytes: commandOptions.maxAiContextBytes,
          maxAiOutputTokens: commandOptions.maxAiOutputTokens,
          aiTimeoutMs: commandOptions.aiTimeoutMs
        }
      };
      if (commandOptions.out !== undefined) {
        reviewOptions.out = commandOptions.out;
      }
      if (commandOptions.ai) {
        console.error("⚠ --ai direct provider is experimental. Production reviews run via OMO (OhMyOpenCode).");
      }

      const { result, outPath } = await runReview(reviewOptions);
      if (reviewOptions.verbose) {
        console.log(`target: ${result.resolvedTarget}`);
        console.log(`git: ${result.diffScope.isGitRepo ? "yes" : "no"}`);
        console.log(`context: ${result.context.entries.length} file(s)`);
      }
      console.log(`orev report written: ${outPath}`);
      if (reviewOptions.failOnSecrets && result.secrets.length > 0) {
        process.exitCode = 2;
      } else if (reviewOptions.ai?.enabled === true && result.ai?.status !== "success") {
        process.exitCode = 1;
      }
    });

  const privacy = program
    .command("privacy")
    .description("Privacy utilities");

  privacy
    .command("gate")
    .argument("[target]", "target project path", ".")
    .option("--out <path>", "Markdown privacy report output path")
    .option("--format <format>", "output format", parseFormat, "markdown")
    .option("--fail-on-block", "exit with code 2 when the privacy decision is BLOCK", true)
    .option("--no-fail-on-block", "write a blocked privacy report but exit 0")
    .option("--verbose", "print extra execution details", false)
    .action(async (target: string, commandOptions: PrivacyCommanderOptions) => {
      const privacyOptions: PrivacyOptions = {
        target,
        format: commandOptions.format,
        failOnBlock: commandOptions.failOnBlock,
        verbose: commandOptions.verbose
      };
      if (commandOptions.out !== undefined) {
        privacyOptions.out = commandOptions.out;
      }

      const { result, outPath } = await runPrivacyGate(privacyOptions);
      if (privacyOptions.verbose) {
        console.log(`target: ${result.resolvedTarget}`);
        console.log(`git: ${result.diffScope.isGitRepo ? "yes" : "no"}`);
        console.log(`privacy findings: ${result.findings.length}`);
      }
      console.log(`orev privacy report written: ${outPath}`);
      console.log(`privacy decision: ${result.overallDecision}`);
      if (privacyOptions.failOnBlock && result.overallDecision === "BLOCK") {
        process.exitCode = 2;
      }
    });

  return program;
}

export async function main(argv: string[]): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}

main(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`orev failed: ${message}`);
  process.exitCode = 1;
});
