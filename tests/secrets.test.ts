import { describe, expect, it } from "vitest";
import { detectSecrets } from "../src/secrets.js";

const openAiKey = `sk-${"A".repeat(48)}`;

describe("detectSecrets", () => {
  it("detects only added secret lines and redacts values", () => {
    const diff = [
      "diff --git a/app.ts b/app.ts",
      "--- a/app.ts",
      "+++ b/app.ts",
      "@@ -1,2 +1,3 @@",
      `-const oldKey = \"${openAiKey}\";`,
      " const unchanged = true;",
      `+const apiKey = \"${openAiKey}\";`,
      "+const db = \"postgres://user:pass@example.com/db\";"
    ].join("\n");

    const findings = detectSecrets(diff);

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.type)).toEqual([
      "OpenAI API Key",
      "Database URL with credentials"
    ]);
    expect(findings[0]?.redacted).not.toContain(openAiKey);
    expect(findings[0]?.file).toBe("app.ts");
  });

  it("supports same-line suppression and reports .env files in diff", () => {
    const diff = [
      "diff --git a/.env b/.env",
      "--- /dev/null",
      "+++ b/.env",
      "@@ -0,0 +1,2 @@",
      `+OPENAI_API_KEY=${openAiKey} # orev:ignore-secret`,
      "+SAFE=value"
    ].join("\n");

    const findings = detectSecrets(diff);

    expect(findings).toEqual([
      {
        type: ".env file in diff",
        file: ".env",
        line: 1,
        redacted: "[file path only]"
      }
    ]);
  });
});
