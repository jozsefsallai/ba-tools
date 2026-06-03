import { type PlanaProviderId, readPlanaConfig } from "@/lib/ai/plana-config";
import { createGateway } from "@ai-sdk/gateway";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

const DEFAULT_OPENROUTER_CHAT_MODEL = "deepseek/deepseek-v4-flash";
const DEFAULT_GATEWAY_CHAT_MODEL = "deepseek/deepseek-v3.1";
const DEFAULT_CLASSIFIER_MODEL = "google/gemini-2.5-flash-lite";

export class PlanaNotConfiguredError extends Error {
  constructor() {
    super("Plana AI is not configured");
    this.name = "PlanaNotConfiguredError";
  }
}

type PlanaProvider = {
  chatModel: LanguageModel;
  classifierModel: LanguageModel;
  provider: PlanaProviderId;
};

export async function getPlanaProvider(): Promise<PlanaProvider> {
  const config = await readPlanaConfig();

  if (!config) {
    throw new PlanaNotConfiguredError();
  }

  if (config.provider === "gateway") {
    const gateway = createGateway({ apiKey: config.apiKey });

    return {
      chatModel: gateway(config?.chatModel || DEFAULT_GATEWAY_CHAT_MODEL),
      classifierModel: gateway(DEFAULT_CLASSIFIER_MODEL),
      provider: config.provider,
    };
  }

  const openrouter = createOpenRouter({ apiKey: config.apiKey });

  return {
    chatModel: openrouter(config?.chatModel || DEFAULT_OPENROUTER_CHAT_MODEL),
    classifierModel: openrouter(DEFAULT_CLASSIFIER_MODEL),
    provider: config.provider,
  };
}

export function getDefaultChatModel(provider: PlanaProviderId) {
  return provider === "gateway"
    ? DEFAULT_GATEWAY_CHAT_MODEL
    : DEFAULT_OPENROUTER_CHAT_MODEL;
}
