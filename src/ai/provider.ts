import process from "node:process";
import type { AiProvider, AiProviderRequest } from "../types.js";

export const DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-latest";

export interface ResolvedAiProvider {
  provider: AiProvider;
  providerName: string;
  apiModel: string;
}

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  constructor(private readonly apiKey: string) {}

  async generateJson(request: AiProviderRequest): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: request.maxOutputTokens,
          messages: [{ role: "user", content: request.prompt }]
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Anthropic request failed with HTTP ${response.status}`);
      }
      const body: unknown = await response.json();
      return extractText(body);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractText(body: unknown): string {
  if (!isRecord(body) || !Array.isArray(body.content)) {
    throw new Error("Anthropic response did not contain text content");
  }
  const texts: string[] = [];
  for (const item of body.content) {
    if (isRecord(item) && item.type === "text" && typeof item.text === "string") {
      texts.push(item.text);
    }
  }
  if (texts.length === 0) {
    throw new Error("Anthropic response text content was empty");
  }
  return texts.join("\n");
}

export function resolveAiProvider(model: string, injectedProvider?: AiProvider): ResolvedAiProvider {
  if (model === "claude" || model.startsWith("claude-")) {
    const apiModel = model === "claude" ? process.env.OREV_CLAUDE_MODEL ?? DEFAULT_CLAUDE_MODEL : model;
    if (injectedProvider !== undefined) {
      return { provider: injectedProvider, providerName: injectedProvider.name, apiModel };
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey === undefined || apiKey.trim().length === 0) {
      throw new Error("ANTHROPIC_API_KEY is required for --model claude");
    }
    return { provider: new AnthropicProvider(apiKey), providerName: "anthropic", apiModel };
  }
  throw new Error(`Unsupported AI model: ${model}`);
}
