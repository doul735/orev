import type { SecretFinding } from "./types.js";

interface SecretPattern {
  name: string;
  regex: RegExp;
}

const patterns: SecretPattern[] = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "AWS Secret Key", regex: /aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}/gi },
  { name: "GitHub Personal Access Token", regex: /ghp_[A-Za-z0-9]{36,}/g },
  { name: "GitHub OAuth Token", regex: /gho_[A-Za-z0-9]{36,}/g },
  { name: "GitHub Fine-grained PAT", regex: /github_pat_[A-Za-z0-9_]{82,}/g },
  { name: "OpenAI API Key", regex: /sk-[A-Za-z0-9]{48,}/g },
  { name: "Anthropic API Key", regex: /sk-ant-[A-Za-z0-9-]{80,}/g },
  { name: "Stripe Live Secret Key", regex: /sk_live_[A-Za-z0-9]{24,}/g },
  { name: "Stripe Restricted Key", regex: /rk_live_[A-Za-z0-9]{24,}/g },
  { name: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: "Database URL with credentials", regex: /(mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s"']+@[^\s"']+/gi },
  { name: "Slack Bot Token", regex: /xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24}/g },
  { name: "Slack User Token", regex: /xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}/g },
  { name: "SendGrid API Key", regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g },
  { name: "Private Key", regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g }
];

function isEnvFile(file: string): boolean {
  const parts = file.split("/");
  const base = parts.at(-1) ?? file;
  return base === ".env" || base.startsWith(".env.") || parts.includes(".env");
}

function redact(value: string): string {
  if (value.length <= 8) {
    return "***";
  }
  return `${value.slice(0, 4)}${"*".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}

export function containsSecretPattern(value: string): boolean {
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(value)) {
      return true;
    }
  }
  return false;
}

export function redactSecretsInText(value: string): string {
  let redacted = value;
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    redacted = redacted.replace(pattern.regex, `[REDACTED ${pattern.name}]`);
  }
  return redacted;
}

function parseHunkStart(line: string): number | undefined {
  const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!match?.[1]) {
    return undefined;
  }
  return Number.parseInt(match[1], 10);
}

export function detectSecrets(diff: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const envFiles = new Set<string>();
  let currentFile = "unknown";
  let newLine = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      if (isEnvFile(currentFile)) {
        envFiles.add(currentFile);
      }
      continue;
    }

    if (line.startsWith("@@")) {
      const start = parseHunkStart(line);
      if (start !== undefined) {
        newLine = start - 1;
      }
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      newLine += 1;
      const added = line.slice(1);
      if (added.includes("orev:ignore-secret")) {
        continue;
      }
      for (const pattern of patterns) {
        pattern.regex.lastIndex = 0;
        for (const match of added.matchAll(pattern.regex)) {
          if (match[0]) {
            findings.push({
              type: pattern.name,
              file: currentFile,
              line: newLine,
              redacted: redact(match[0])
            });
          }
        }
      }
      continue;
    }

    if (line.startsWith(" ")) {
      newLine += 1;
    }
  }

  for (const file of Array.from(envFiles).sort((a, b) => a.localeCompare(b))) {
    findings.push({
      type: ".env file in diff",
      file,
      line: 1,
      redacted: "[file path only]"
    });
  }

  return findings;
}
